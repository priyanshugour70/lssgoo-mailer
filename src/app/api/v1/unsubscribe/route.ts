import { NextResponse } from "next/server";

import { readUnsubscribeToken } from "@/lib/mail/unsubscribe-token";
import { suppressEmails } from "@/service/mailer/suppressions";

/**
 * Public. Handles both the confirm button on /unsubscribe (form post) and
 * mail clients' one-click List-Unsubscribe POST. The token is signed, so it
 * can only unsubscribe the single address it was issued for.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("t");
  let fromForm = false;
  const type = request.headers.get("content-type") ?? "";
  if (!token && type.includes("form")) {
    const form = await request.formData().catch(() => null);
    token = (form?.get("t") as string | null) ?? null;
    fromForm = Boolean(token);
  }
  const parsed = readUnsubscribeToken(token);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  await suppressEmails(parsed.userId, [parsed.email], "unsubscribed");
  if (fromForm) {
    return NextResponse.redirect(new URL(`/unsubscribe?done=1`, request.url), 303);
  }
  return NextResponse.json({ ok: true });
}
