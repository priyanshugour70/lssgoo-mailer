import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { parseContacts } from "@/lib/contacts/parse";
import { listSuppressions, removeSuppressions, suppressEmails } from "@/service/mailer/suppressions";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return NextResponse.json({ suppressions: await listSuppressions(auth.user.id) });
}

const addSchema = z.object({ raw: z.string().min(1).max(500_000) });

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { contacts, invalid } = parseContacts(parsed.data.raw, { guessNames: false });
  if (contacts.length === 0) {
    return NextResponse.json({ error: "No valid email addresses found.", invalid }, { status: 400 });
  }
  const added = await suppressEmails(auth.user.id, contacts.map((c) => c.email), "manual");
  return NextResponse.json({ added, invalid }, { status: 201 });
}

const deleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) });

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  return NextResponse.json({ removed: await removeSuppressions(auth.user.id, parsed.data.ids) });
}
