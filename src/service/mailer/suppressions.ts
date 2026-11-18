import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { suppressions } from "@/lib/db/schema";

export async function listSuppressions(userId: string) {
  return getDb()
    .select()
    .from(suppressions)
    .where(eq(suppressions.userId, userId))
    .orderBy(desc(suppressions.createdAt));
}

export async function suppressEmails(
  userId: string,
  emails: string[],
  reason: "manual" | "unsubscribed" | "bounced" = "manual",
) {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return 0;
  const rows = await getDb()
    .insert(suppressions)
    .values(unique.map((email) => ({ userId, email, reason })))
    .onConflictDoNothing()
    .returning({ id: suppressions.id });
  return rows.length;
}

export async function removeSuppressions(userId: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const rows = await getDb()
    .delete(suppressions)
    .where(and(eq(suppressions.userId, userId), inArray(suppressions.id, ids)))
    .returning({ id: suppressions.id });
  return rows.length;
}

export async function suppressedSet(userId: string) {
  const rows = await getDb()
    .select({ email: sql<string>`lower(${suppressions.email})` })
    .from(suppressions)
    .where(eq(suppressions.userId, userId));
  return new Set(rows.map((r) => r.email));
}
