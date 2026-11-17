import { requireApiUser } from "@/lib/api/require-user";
import { listContacts } from "@/service/mailer/contacts";

/** Spreadsheet apps execute cells starting with these; neutralise them. */
function cell(value: string | null) {
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const rows = await listContacts(auth.user.id);
  const lines = [
    "email,first_name,last_name,company,notes",
    ...rows.map((row) =>
      [row.email, row.firstName, row.lastName, row.company, row.notes].map(cell).join(","),
    ),
  ];
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="contacts-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
