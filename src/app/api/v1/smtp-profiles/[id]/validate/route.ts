import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { validateSmtpProfile } from "@/service/mailer/smtp-profiles";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const result = await validateSmtpProfile(auth.user.id, id);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ result });
}