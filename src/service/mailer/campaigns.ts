import "server-only";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  campaignPicks,
  campaignSends,
  campaigns,
  deliveryLedger,
  users,
  type contacts,
} from "@/lib/db/schema";
import {
  contactToRecipient,
  renderTemplate,
} from "@/lib/mail/template-render";
import { sendPersonalMail } from "@/lib/mail/smtp-transport";

import { getContactsByIds, listContacts, listContactsByCompany } from "./contacts";
import { getUploadedFile } from "./files";
import { getSmtpForSend } from "./smtp-profiles";
import { getTemplate } from "./templates";

export type CampaignInput = {
  name: string;
  templateId: string;
  smtpProfileId: string;
  recipientMode: "all" | "filter" | "pick";
  companyFilter?: string | null;
  skipAlreadySent?: boolean;
  contactIds?: string[];
};

export async function createCampaign(userId: string, input: CampaignInput) {
  const db = getDb();
  const [campaign] = await db
    .insert(campaigns)
    .values({
      userId,
      name: input.name.trim(),
      templateId: input.templateId,
      smtpProfileId: input.smtpProfileId,
      recipientMode: input.recipientMode,
      companyFilter: input.companyFilter?.trim() || null,
      skipAlreadySent: input.skipAlreadySent ?? true,
      status: "draft",
    })
    .returning();

  if (!campaign) throw new Error("Campaign was not created.");

  if (input.recipientMode === "pick" && input.contactIds?.length) {
    await db.insert(campaignPicks).values(
      input.contactIds.map((contactId) => ({
        campaignId: campaign.id,
        contactId,
      })),
    );
  }

  return campaign;
}

async function resolveRecipients(
  userId: string,
  campaign: typeof campaigns.$inferSelect,
): Promise<(typeof contacts.$inferSelect)[]> {
  if (campaign.recipientMode === "all") {
    return listContacts(userId);
  }
  if (campaign.recipientMode === "filter" && campaign.companyFilter) {
    return listContactsByCompany(userId, campaign.companyFilter);
  }
  if (campaign.recipientMode === "pick") {
    const db = getDb();
    const picks = await db
      .select({ contactId: campaignPicks.contactId })
      .from(campaignPicks)
      .where(eq(campaignPicks.campaignId, campaign.id));
    return getContactsByIds(
      userId,
      picks.map((pick) => pick.contactId),
    );
  }
  return [];
}

async function alreadySent(
  userId: string,
  templateId: string,
  email: string,
) {
  const db = getDb();
  const [row] = await db
    .select({ id: deliveryLedger.id })
    .from(deliveryLedger)
    .where(
      and(
        eq(deliveryLedger.userId, userId),
        eq(deliveryLedger.templateId, templateId),
        eq(deliveryLedger.recipientEmail, email.toLowerCase()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function loadSender(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw new Error("User not found.");
  return row;
}

async function bumpCampaignProgress(
  campaignId: string,
  patch: {
    processedCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  },
) {
  const db = getDb();
  await db
    .update(campaigns)
    .set({
      processedCount: patch.processedCount,
      sentCount: patch.sentCount,
      failedCount: patch.failedCount,
      skippedCount: patch.skippedCount,
    })
    .where(eq(campaigns.id, campaignId));
}

export async function runCampaign(userId: string, campaignId: string) {
  const db = getDb();
  const sender = await loadSender(userId);
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);

  if (!campaign) return { error: "Campaign not found." as const };
  if (campaign.status === "running") {
    return { error: "Campaign is already running." as const };
  }

  const template = await getTemplate(userId, campaign.templateId);
  if (!template) return { error: "Template not found." as const };

  const smtp = await getSmtpForSend(userId, campaign.smtpProfileId);
  if (!smtp) {
    return {
      error: "SMTP profile is missing or not validated. Use Validate mail first.",
    } as const;
  }

  const recipients = await resolveRecipients(userId, campaign);
  if (recipients.length === 0) {
    return { error: "No recipients selected." as const };
  }

  let attachmentPath: string | undefined;
  if (template.pdfFileId) {
    const file = await getUploadedFile(userId, template.pdfFileId);
    if (file) {
      attachmentPath = file.storagePath;
    }
  }

  await db
    .update(campaigns)
    .set({
      status: "running",
      startedAt: new Date(),
      totalRecipients: recipients.length,
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
    })
    .where(eq(campaigns.id, campaignId));

  const results: {
    email: string;
    status: "sent" | "failed" | "skipped";
    error?: string;
  }[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const contact of recipients) {
    const email = contact.email.toLowerCase();

    if (campaign.skipAlreadySent) {
      const sentBefore = await alreadySent(userId, template.id, email);
      if (sentBefore) {
        await db.insert(campaignSends).values({
          campaignId,
          userId,
          contactId: contact.id,
          recipientEmail: email,
          templateId: template.id,
          subject: template.subject,
          status: "skipped",
          errorMessage: "Already sent this template to this address.",
        });
        skippedCount += 1;
        results.push({ email, status: "skipped", error: "Already sent." });
        await bumpCampaignProgress(campaignId, {
          processedCount: results.length,
          sentCount,
          failedCount,
          skippedCount,
        });
        continue;
      }
    }

    const recipient = contactToRecipient(contact);
    const subject = renderTemplate(template.subject, recipient, {
      name: sender.name,
      email: sender.email,
    });
    const html =
      template.format === "html" && template.bodyHtml
        ? renderTemplate(
            template.bodyHtml,
            recipient,
            { name: sender.name, email: sender.email },
            { html: true },
          )
        : undefined;
    const text =
      template.bodyText || template.format === "text"
        ? renderTemplate(
            template.bodyText ?? template.bodyHtml ?? "",
            recipient,
            { name: sender.name, email: sender.email },
          )
        : undefined;

    try {
      const delivery = await sendPersonalMail({
        config: smtp,
        to: email,
        subject,
        html,
        text,
        attachments: attachmentPath
          ? [{ filename: "attachment.pdf", path: attachmentPath }]
          : undefined,
      });

      await db.insert(campaignSends).values({
        campaignId,
        userId,
        contactId: contact.id,
        recipientEmail: email,
        templateId: template.id,
        subject,
        status: "sent",
        smtpMessageId: delivery.messageId,
      });

      await db
        .insert(deliveryLedger)
        .values({
          userId,
          contactId: contact.id,
          templateId: template.id,
          recipientEmail: email,
          campaignId,
        })
        .onConflictDoNothing();

      sentCount += 1;
      results.push({ email, status: "sent" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send mail.";
      await db.insert(campaignSends).values({
        campaignId,
        userId,
        contactId: contact.id,
        recipientEmail: email,
        templateId: template.id,
        subject,
        status: "failed",
        errorMessage: message,
      });
      failedCount += 1;
      results.push({ email, status: "failed", error: message });
    }

    await bumpCampaignProgress(campaignId, {
      processedCount: results.length,
      sentCount,
      failedCount,
      skippedCount,
    });
  }

  const failed = results.some((row) => row.status === "failed");
  await db
    .update(campaigns)
    .set({
      status: failed ? "failed" : "completed",
      completedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  return {
    campaignId,
    total: results.length,
    sent: results.filter((row) => row.status === "sent").length,
    skipped: results.filter((row) => row.status === "skipped").length,
    failed: results.filter((row) => row.status === "failed").length,
    results,
  };
}

export type HistoryQuery = {
  page?: number;
  pageSize?: number;
  status?: "sent" | "skipped" | "failed";
  q?: string;
};

export async function listCampaignHistory(
  userId: string,
  query: HistoryQuery = {},
) {
  const db = getDb();
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const search = query.q?.trim();
  const base = [eq(campaignSends.userId, userId)];
  if (search) {
    const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
    base.push(
      or(
        ilike(campaignSends.recipientEmail, pattern),
        ilike(campaignSends.subject, pattern),
      )!,
    );
  }
  const filtered = query.status
    ? [...base, eq(campaignSends.status, query.status)]
    : base;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(campaignSends)
      .where(and(...filtered))
      .orderBy(desc(campaignSends.sentAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ status: campaignSends.status, value: count() })
      .from(campaignSends)
      .where(and(...base))
      .groupBy(campaignSends.status),
  ]);

  const counts = { sent: 0, skipped: 0, failed: 0 };
  for (const row of totals) {
    if (row.status in counts) counts[row.status as keyof typeof counts] = row.value;
  }
  const all = counts.sent + counts.skipped + counts.failed;
  const total = query.status ? counts[query.status] : all;

  return {
    history: rows,
    page,
    pageSize,
    total,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
    counts: { all, ...counts },
  };
}

export async function listCampaigns(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(campaigns.createdAt);
}