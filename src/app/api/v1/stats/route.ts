import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";

import { requireApiUser } from "@/lib/api/require-user";
import { getDb } from "@/lib/db/client";
import {
  campaignSends,
  campaigns,
  contacts,
  smtpProfiles,
  templates,
} from "@/lib/db/schema";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const userId = auth.user.id;
  const db = getDb();

  const [contactRow] = await db
    .select({ value: count() })
    .from(contacts)
    .where(eq(contacts.ownerId, userId));
  const [templateRow] = await db
    .select({ value: count() })
    .from(templates)
    .where(eq(templates.userId, userId));
  const [smtpRow] = await db
    .select({ value: count() })
    .from(smtpProfiles)
    .where(eq(smtpProfiles.userId, userId));
  const [campaignRow] = await db
    .select({ value: count() })
    .from(campaigns)
    .where(eq(campaigns.userId, userId));
  const [sentRow] = await db
    .select({ value: count() })
    .from(campaignSends)
    .where(eq(campaignSends.userId, userId));

  const profiles = await db
    .select({ isValid: smtpProfiles.isValid })
    .from(smtpProfiles)
    .where(eq(smtpProfiles.userId, userId));

  return NextResponse.json({
    stats: {
      contacts: contactRow?.value ?? 0,
      templates: templateRow?.value ?? 0,
      smtpProfiles: smtpRow?.value ?? 0,
      smtpValidated: profiles.filter((p) => p.isValid).length,
      campaigns: campaignRow?.value ?? 0,
      sends: sentRow?.value ?? 0,
    },
  });
}