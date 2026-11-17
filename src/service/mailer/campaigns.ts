import "server-only";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  campaignPicks,
  campaignSends,
  campaigns,
  deliveryLedger,
  templates,
  users,
  type contacts,
} from "@/lib/db/schema";
import {
  contactToRecipient,
  renderTemplate,
} from "@/lib/mail/template-render";
import { createMailer } from "@/lib/mail/smtp-transport";

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

/** A run older than this with no completion is presumed killed (serverless timeout). */
export const STALL_AFTER_MS = 6 * 60 * 1000;

export async function runCampaign(
  userId: string,
  campaignId: string,
  options: { resume?: boolean } = {},
) {
  const db = getDb();
  const sender = await loadSender(userId);
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);

  if (!campaign) return { error: "Campaign not found." as const };

  if (campaign.status === "running") {
    if (!options.resume) return { error: "Campaign is already running." as const };
    const startedAt = campaign.startedAt?.getTime() ?? 0;
    if (Date.now() - startedAt < STALL_AFTER_MS) {
      return {
        error: "This campaign is still sending. You can resume it if it hasn't moved in a few minutes." as const,
      };
    }
  } else if (options.resume && campaign.status !== "failed") {
    return { error: "Only stalled or failed campaigns can be resumed." as const };
  }

  const template = await getTemplate(userId, campaign.templateId);
  if (!template) return { error: "Template not found." as const };

  const smtp = await getSmtpForSend(userId, campaign.smtpProfileId);
  if (!smtp) {
    return {
      error: "SMTP profile is missing or not validated. Verify the sender in Setup first.",
    } as const;
  }

  const recipients = await resolveRecipients(userId, campaign);
  if (recipients.length === 0) {
    return { error: "No recipients selected." as const };
  }

  let attachmentPath: string | undefined;
  if (template.pdfFileId) {
    const file = await getUploadedFile(userId, template.pdfFileId);
    if (file) attachmentPath = file.storagePath;
  }

  // On resume, recipients that already succeeded (or were skipped) are not
  // touched again; failed ones are retried.
  const done = new Set<string>();
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  if (options.resume) {
    const prior = await db
      .select({ email: campaignSends.recipientEmail, status: campaignSends.status })
      .from(campaignSends)
      .where(eq(campaignSends.campaignId, campaignId));
    for (const row of prior) {
      if (row.status === "sent") sentCount += 1;
      else if (row.status === "skipped") skippedCount += 1;
      else continue;
      done.add(row.email.toLowerCase());
    }
  }

  await db
    .update(campaigns)
    .set({
      status: "running",
      startedAt: new Date(),
      completedAt: null,
      totalRecipients: recipients.length,
      processedCount: sentCount + skippedCount,
      sentCount,
      failedCount: 0,
      skippedCount,
    })
    .where(eq(campaigns.id, campaignId));

  const mailer = createMailer(smtp);
  const senderInfo = { name: sender.name, email: sender.email };

  try {
    for (const contact of recipients) {
      const email = contact.email.toLowerCase();
      if (done.has(email)) continue;

      if (campaign.skipAlreadySent && (await alreadySent(userId, template.id, email))) {
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
      } else {
        const recipient = contactToRecipient(contact);
        const subject = renderTemplate(template.subject, recipient, senderInfo);
        const html =
          template.format === "html" && template.bodyHtml
            ? renderTemplate(template.bodyHtml, recipient, senderInfo, { html: true })
            : undefined;
        const text =
          template.bodyText || template.format === "text"
            ? renderTemplate(template.bodyText ?? template.bodyHtml ?? "", recipient, senderInfo)
            : undefined;

        try {
          const delivery = await mailer.send({
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
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to send mail.";
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
        }
      }

      await bumpCampaignProgress(campaignId, {
        processedCount: sentCount + skippedCount + failedCount,
        sentCount,
        failedCount,
        skippedCount,
      });
    }

    await db
      .update(campaigns)
      .set({ status: failedCount > 0 ? "failed" : "completed", completedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
  } catch (error) {
    // Unexpected (e.g. database) error: never leave the campaign "running".
    await db
      .update(campaigns)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
    throw error;
  } finally {
    mailer.close();
  }

  return {
    campaignId,
    total: sentCount + skippedCount + failedCount,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount,
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

export async function listCampaigns(userId: string, limit = 100) {
  const db = getDb();
  return db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      recipientMode: campaigns.recipientMode,
      totalRecipients: campaigns.totalRecipients,
      processedCount: campaigns.processedCount,
      sentCount: campaigns.sentCount,
      failedCount: campaigns.failedCount,
      skippedCount: campaigns.skippedCount,
      createdAt: campaigns.createdAt,
      startedAt: campaigns.startedAt,
      completedAt: campaigns.completedAt,
      templateName: templates.name,
    })
    .from(campaigns)
    .leftJoin(templates, eq(templates.id, campaigns.templateId))
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.createdAt))
    .limit(limit);
}

/** Returns a user-facing error if the campaign can't be started, else null. */
export async function preflightCampaign(userId: string, input: CampaignInput) {
  const template = await getTemplate(userId, input.templateId);
  if (!template) return "That template no longer exists.";
  const profile = await getSmtpForSend(userId, input.smtpProfileId);
  if (!profile) return "Choose a verified sender. Verify it in Setup first.";

  let count = 0;
  if (input.recipientMode === "all") count = (await listContacts(userId)).length;
  else if (input.recipientMode === "filter") {
    count = input.companyFilter?.trim()
      ? (await listContactsByCompany(userId, input.companyFilter.trim())).length
      : 0;
  } else count = (await getContactsByIds(userId, input.contactIds ?? [])).length;
  return count === 0 ? "No recipients match this audience." : null;
}

export async function getCampaignDetail(
  userId: string,
  campaignId: string,
  query: { page?: number; status?: "sent" | "skipped" | "failed" } = {},
) {
  const db = getDb();
  const [campaign] = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      recipientMode: campaigns.recipientMode,
      companyFilter: campaigns.companyFilter,
      skipAlreadySent: campaigns.skipAlreadySent,
      totalRecipients: campaigns.totalRecipients,
      processedCount: campaigns.processedCount,
      sentCount: campaigns.sentCount,
      failedCount: campaigns.failedCount,
      skippedCount: campaigns.skippedCount,
      createdAt: campaigns.createdAt,
      startedAt: campaigns.startedAt,
      completedAt: campaigns.completedAt,
      templateName: templates.name,
      templateSubject: templates.subject,
    })
    .from(campaigns)
    .leftJoin(templates, eq(templates.id, campaigns.templateId))
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);
  if (!campaign) return null;

  const pageSize = 25;
  const page = Math.max(query.page ?? 1, 1);
  const where = and(
    eq(campaignSends.campaignId, campaignId),
    eq(campaignSends.userId, userId),
    query.status ? eq(campaignSends.status, query.status) : undefined,
  );
  const [sends, [totalRow]] = await Promise.all([
    db
      .select({
        id: campaignSends.id,
        recipientEmail: campaignSends.recipientEmail,
        subject: campaignSends.subject,
        status: campaignSends.status,
        errorMessage: campaignSends.errorMessage,
        sentAt: campaignSends.sentAt,
      })
      .from(campaignSends)
      .where(where)
      .orderBy(desc(campaignSends.sentAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(campaignSends).where(where),
  ]);
  const total = totalRow?.value ?? 0;
  const stalled =
    campaign.status === "running" &&
    Date.now() - (campaign.startedAt?.getTime() ?? 0) > STALL_AFTER_MS;

  return {
    campaign: { ...campaign, stalled },
    sends,
    page,
    pageSize,
    total,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}
