import "server-only";

import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";

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
  const clean = (value?: string | null) => value?.trim() || null;
  const values = {
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    company: clean(input.company),
    notes: clean(input.notes),
  };
  // Only overwrite fields the caller actually provided, so re-importing a bare
  // email never wipes details that were saved earlier.
  const set: Partial<typeof values> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  for (const key of Object.keys(values) as (keyof typeof values)[]) {
    if (values[key]) set[key] = values[key];
  }
  // The unique index may be on (owner_id, email) or (owner_id, lower(email))
  // depending on how the database was provisioned, so ON CONFLICT can't target
  // it reliably. Look up case-insensitively, then update or insert.
  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.ownerId, ownerId), sql`lower(${contacts.email}) = ${email}`))
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(contacts)
      .set(set)
      .where(eq(contacts.id, existing.id))
      .returning();
    return row;
  }
  try {
    const [row] = await db
      .insert(contacts)
      .values({ ownerId, email, ...values })
      .returning();
    return row;
  } catch (error) {
    // Lost a race with a concurrent insert of the same address: update it.
    const [row] = await db
      .update(contacts)
      .set(set)
      .where(and(eq(contacts.ownerId, ownerId), sql`lower(${contacts.email}) = ${email}`))
      .returning();
    if (row) return row;
    throw error;
  }
}

export async function updateContact(
  ownerId: string,
  id: string,
  input: Omit<ContactInput, "email"> & { email?: string },
) {
  const db = getDb();
  const clean = (value?: string | null) => value?.trim() || null;
  const [row] = await db
    .update(contacts)
    .set({
      ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
      firstName: clean(input.firstName),
      lastName: clean(input.lastName),
      company: clean(input.company),
      notes: clean(input.notes),
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)))
    .returning();
  return row ?? null;
}

export async function deleteContacts(ownerId: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const db = getDb();
  const rows = await db
    .delete(contacts)
    .where(and(eq(contacts.ownerId, ownerId), inArray(contacts.id, ids)))
    .returning({ id: contacts.id });
  return rows.length;
}

export async function bulkCreateContacts(ownerId: string, rows: ContactInput[]) {
  const created = [];
  for (const row of rows) {
    if (!row.email?.trim()) continue;
    created.push(await createContact(ownerId, row));
  }
  return created;
}

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function parseBulkEmails(raw: string) {
  const seen = new Set<string>();
  const valid: ContactInput[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_PATTERN.test(email)) {
      invalid.push(part.trim());
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push({ email });
  }
  return { valid, invalid };
}

export async function getContactsByIds(ownerId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(and(eq(contacts.ownerId, ownerId), inArray(contacts.id, ids)));
}