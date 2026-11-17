import "server-only";

import { and, eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { getDb } from "@/lib/db/client";
import { smtpProfiles } from "@/lib/db/schema";
import { verifySmtp } from "@/lib/mail/smtp-transport";

export type SmtpProfileInput = {
  label?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName?: string | null;
  fromEmail: string;
};

export async function listSmtpProfiles(userId: string) {
  const db = getDb();
  return db
    .select({
      id: smtpProfiles.id,
      label: smtpProfiles.label,
      host: smtpProfiles.host,
      port: smtpProfiles.port,
      secure: smtpProfiles.secure,
      username: smtpProfiles.username,
      fromName: smtpProfiles.fromName,
      fromEmail: smtpProfiles.fromEmail,
      isValid: smtpProfiles.isValid,
      lastValidatedAt: smtpProfiles.lastValidatedAt,
      validationError: smtpProfiles.validationError,
      createdAt: smtpProfiles.createdAt,
    })
    .from(smtpProfiles)
    .where(eq(smtpProfiles.userId, userId));
}

export async function createSmtpProfile(userId: string, input: SmtpProfileInput) {
  const db = getDb();
  const [row] = await db
    .insert(smtpProfiles)
    .values({
      userId,
      label: input.label?.trim() || "Default",
      host: input.host.trim(),
      port: input.port,
      secure: input.secure,
      username: input.username.trim(),
      passwordEncrypted: encryptSecret(input.password),
      fromName: input.fromName?.trim() || null,
      fromEmail: input.fromEmail.trim().toLowerCase(),
    })
    .returning({
      id: smtpProfiles.id,
      label: smtpProfiles.label,
      host: smtpProfiles.host,
      port: smtpProfiles.port,
      secure: smtpProfiles.secure,
      username: smtpProfiles.username,
      fromName: smtpProfiles.fromName,
      fromEmail: smtpProfiles.fromEmail,
      isValid: smtpProfiles.isValid,
    });
  return row;
}

async function loadSmtpWithPassword(userId: string, profileId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(smtpProfiles)
    .where(and(eq(smtpProfiles.userId, userId), eq(smtpProfiles.id, profileId)))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    password: decryptSecret(row.passwordEncrypted),
  };
}

export async function validateSmtpProfile(userId: string, profileId: string) {
  const row = await loadSmtpWithPassword(userId, profileId);
  if (!row) return null;

  const result = await verifySmtp({
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    password: row.password,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
  });

  const db = getDb();
  const [updated] = await db
    .update(smtpProfiles)
    .set({
      isValid: result.ok,
      validationError: result.ok ? null : result.error,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(smtpProfiles.id, profileId))
    .returning({
      id: smtpProfiles.id,
      isValid: smtpProfiles.isValid,
      validationError: smtpProfiles.validationError,
      lastValidatedAt: smtpProfiles.lastValidatedAt,
    });

  return { ...updated, ok: result.ok };
}

export async function getSmtpForSend(userId: string, profileId: string) {
  const row = await loadSmtpWithPassword(userId, profileId);
  if (!row || !row.isValid) return null;
  return {
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    password: row.password,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
  };
}
export async function deleteSmtpProfile(userId: string, profileId: string) {
  const db = getDb();
  try {
    const rows = await db
      .delete(smtpProfiles)
      .where(and(eq(smtpProfiles.userId, userId), eq(smtpProfiles.id, profileId)))
      .returning({ id: smtpProfiles.id });
    return rows.length > 0 ? ("deleted" as const) : ("not_found" as const);
  } catch {
    // campaigns reference SMTP profiles with ON DELETE RESTRICT
    return "in_use" as const;
  }
}
