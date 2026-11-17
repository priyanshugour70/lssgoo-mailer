import "server-only";

import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  campaignSends,
  campaigns,
  contacts,
  smtpProfiles,
  templates,
} from "@/lib/db/schema";

export async function getDashboardPayload(userId: string) {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [contactRow] = await db
    .select({ value: count() })
    .from(contacts)
    .where(eq(contacts.ownerId, userId));
  const [templateRow] = await db
    .select({ value: count() })
    .from(templates)
    .where(eq(templates.userId, userId));
  const profiles = await db
    .select({ isValid: smtpProfiles.isValid })
    .from(smtpProfiles)
    .where(eq(smtpProfiles.userId, userId));
  const sendTotals = await db
    .select({ status: campaignSends.status, value: count() })
    .from(campaignSends)
    .where(eq(campaignSends.userId, userId))
    .groupBy(campaignSends.status);
  const sendCount = (status: string) =>
    sendTotals.find((row) => row.status === status)?.value ?? 0;

  const recentCampaigns = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      totalRecipients: campaigns.totalRecipients,
      sentCount: campaigns.sentCount,
      failedCount: campaigns.failedCount,
      skippedCount: campaigns.skippedCount,
      createdAt: campaigns.createdAt,
    })
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.createdAt))
    .limit(5);

  const sendsByDay = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${campaignSends.sentAt}), 'YYYY-MM-DD')`,
      total: count(),
      sent: sql<number>`count(*) filter (where ${campaignSends.status} = 'sent')`,
      failed: sql<number>`count(*) filter (where ${campaignSends.status} = 'failed')`,
    })
    .from(campaignSends)
    .where(
      and(eq(campaignSends.userId, userId), gte(campaignSends.sentAt, since)),
    )
    .groupBy(sql`date_trunc('day', ${campaignSends.sentAt})`)
    .orderBy(sql`date_trunc('day', ${campaignSends.sentAt})`);

  const active = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.userId, userId), eq(campaigns.status, "running")))
    .orderBy(desc(campaigns.startedAt))
    .limit(5);

  const recent = await db
    .select({
      id: campaignSends.id,
      recipientEmail: campaignSends.recipientEmail,
      subject: campaignSends.subject,
      status: campaignSends.status,
      sentAt: campaignSends.sentAt,
    })
    .from(campaignSends)
    .where(eq(campaignSends.userId, userId))
    .orderBy(desc(campaignSends.sentAt))
    .limit(8);

  return {
    stats: {
      contacts: contactRow?.value ?? 0,
      templates: templateRow?.value ?? 0,
      smtpValidated: profiles.filter((p) => p.isValid).length,
      emailsSent: sendCount("sent"),
      emailsFailed: sendCount("failed"),
      emailsSkipped: sendCount("skipped"),
    },
    recentCampaigns,
    sendsByDay,
    activeCampaigns: active,
    recentSends: recent,
  };
}

export async function getCampaignStatus(userId: string, campaignId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);
  return row ?? null;
}