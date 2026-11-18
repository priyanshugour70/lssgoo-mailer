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
  options: { html?: boolean; unsubscribeUrl?: string } = {},
) {
  const map: Record<string, string> = {
    firstName: recipient.firstName ?? "",
    lastName: recipient.lastName ?? "",
    email: recipient.email,
    company: recipient.company ?? "",
    senderName: sender.name,
    senderEmail: sender.email,
    unsubscribeUrl: options.unsubscribeUrl ?? "",
  };

  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return source.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = map[key] ?? "";
    return options.html ? escape(value) : value;
  });
}