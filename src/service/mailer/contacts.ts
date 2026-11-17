import "server-only";

import { and, desc, eq, ilike, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";

export type ContactInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  notes?: string | null;
};

export async function listContacts(ownerId: string) {
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.ownerId, ownerId))
    .orderBy(desc(contacts.createdAt));
}

export async function listContactsByCompany(ownerId: string, companyFilter: string) {
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(
      and(eq(contacts.ownerId, ownerId), ilike(contacts.company, `%${companyFilter}%`)),
    )
    .orderBy(desc(contacts.createdAt));
}

export async function createContact(ownerId: string, input: ContactInput) {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const [row] = await db
    .insert(contacts)
    .values({
      ownerId,
      email,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      company: input.company?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .onConflictDoUpdate({
      target: [contacts.ownerId, contacts.email],
      set: {
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        company: input.company?.trim() || null,
        notes: input.notes?.trim() || null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function bulkCreateContacts(ownerId: string, rows: ContactInput[]) {
  const created = [];
  for (const row of rows) {
    if (!row.email?.trim()) continue;
    created.push(await createContact(ownerId, row));
  }
  return created;
}

export async function parseBulkEmails(raw: string): Promise<ContactInput[]> {
  const lines = raw.split(/[\n,;]+/);
  const result: ContactInput[] = [];
  for (const line of lines) {
    const email = line.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    result.push({ email });
  }
  return result;
}

export async function getContactsByIds(ownerId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(and(eq(contacts.ownerId, ownerId), inArray(contacts.id, ids)));
}