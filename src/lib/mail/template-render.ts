import type { contacts } from "@/lib/db/schema";

export type TemplateRecipient = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
};

export function contactToRecipient(row: typeof contacts.$inferSelect): TemplateRecipient {
  return {
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
  };
}

export function renderTemplate(
  source: string,
  recipient: TemplateRecipient,
  sender: { name: string; email: string },
) {
  const map: Record<string, string> = {
    firstName: recipient.firstName ?? "",
    lastName: recipient.lastName ?? "",
    email: recipient.email,
    company: recipient.company ?? "",
    senderName: sender.name,
    senderEmail: sender.email,
  };

  return source.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    return map[key] ?? "";
  });
}