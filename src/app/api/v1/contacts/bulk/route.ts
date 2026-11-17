import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { bulkCreateContacts, parseBulkEmails } from "@/service/mailer/contacts";

const bodySchema = z.object({
  raw: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const rows = await parseBulkEmails(parsed.data.raw);
  const contacts = await bulkCreateContacts(auth.user.id, rows);
  return NextResponse.json({ count: contacts.length, contacts }, { status: 201 });
}