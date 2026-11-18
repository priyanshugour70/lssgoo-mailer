import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { MAX_IMPORT, parseContacts } from "@/lib/contacts/parse";
import { bulkImportContacts, deleteContacts, setCompanyForContacts } from "@/service/mailer/contacts";

const importSchema = z.object({
  raw: z.string().min(1).max(2_000_000),
  guessNames: z.boolean().optional(),
  company: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = parseContacts(parsed.data.raw, {
    guessNames: parsed.data.guessNames,
    company: parsed.data.company,
  });
  if (result.contacts.length === 0) {
    return NextResponse.json(
      { error: "No valid email addresses found.", invalid: result.invalid },
      { status: 400 },
    );
  }
  if (result.contacts.length > MAX_IMPORT) {
    return NextResponse.json(
      { error: `Import up to ${MAX_IMPORT} contacts at a time.` },
      { status: 400 },
    );
  }

  const summary = await bulkImportContacts(auth.user.id, result.contacts);
  return NextResponse.json(
    {
      count: result.contacts.length,
      created: summary.created,
      existing: summary.existing,
      updated: summary.updated,
      duplicates: result.duplicates,
      invalid: result.invalid,
    },
    { status: 201 },
  );
}

const deleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) });

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

const companySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
  company: z.string().max(200).nullable(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = companySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const updated = await setCompanyForContacts(auth.user.id, parsed.data.ids, parsed.data.company);
  return NextResponse.json({ updated });
}
