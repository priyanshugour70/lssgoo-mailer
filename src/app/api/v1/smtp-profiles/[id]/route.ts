import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { deleteSmtpProfile } from "@/service/mailer/smtp-profiles";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const result = await deleteSmtpProfile(auth.user.id, id);
  if (result === "not_found") {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  if (result === "in_use") {
    return NextResponse.json(
      { error: "This profile is used by past campaigns and can't be deleted." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
