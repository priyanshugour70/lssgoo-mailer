import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { deleteContacts, updateContact } from "@/service/mailer/contacts";

const bodySchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const contact = await updateContact(auth.user.id, id, parsed.data);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json(
      { error: "Another contact already uses that email." },
      { status: 409 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const removed = await deleteContacts(auth.user.id, [id]);
  if (removed === 0) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
  return NextResponse.json({ removed });
}
