import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import {
  bulkCreateContacts,
  deleteContacts,
  parseBulkEmails,
} from "@/service/mailer/contacts";

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
  const { valid, invalid } = parseBulkEmails(parsed.data.raw);
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid email addresses found.", invalid },
      { status: 400 },
    );
  }
  const contacts = await bulkCreateContacts(auth.user.id, valid);
  return NextResponse.json(
    { count: contacts.length, invalid, contacts },
    { status: 201 },
  );
}

const deleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const removed = await deleteContacts(auth.user.id, parsed.data.ids);
  return NextResponse.json({ removed });
}
