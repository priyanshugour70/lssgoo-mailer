import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { templates } from "@/lib/db/schema";

export type TemplateInput = {
  name: string;
  format: "html" | "text";
  subject: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  pdfFileId?: string | null;
};

export async function listTemplates(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(templates.updatedAt);
}

export async function createTemplate(userId: string, input: TemplateInput) {
  const db = getDb();
  const [row] = await db
    .insert(templates)
    .values({
      userId,
      name: input.name.trim(),
      format: input.format,
      subject: input.subject,
      bodyHtml: input.format === "html" ? input.bodyHtml ?? "" : null,
      bodyText: input.format === "text" ? input.bodyText ?? "" : input.bodyText,
      pdfFileId: input.pdfFileId ?? null,
    })
    .returning();
  return row;
}

export async function getTemplate(userId: string, templateId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.userId, userId), eq(templates.id, templateId)))
    .limit(1);
  return row ?? null;
}
export async function deleteTemplate(userId: string, templateId: string) {
  const db = getDb();
  try {
    const rows = await db
      .delete(templates)
      .where(and(eq(templates.userId, userId), eq(templates.id, templateId)))
      .returning({ id: templates.id });
    return rows.length > 0 ? ("deleted" as const) : ("not_found" as const);
  } catch {
    // campaigns reference templates with ON DELETE RESTRICT
    return "in_use" as const;
  }
}
