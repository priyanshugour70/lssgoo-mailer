import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { cancelCampaign } from "@/service/mailer/campaigns";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const ok = await cancelCampaign(auth.user.id, id);
  if (!ok) {
    return NextResponse.json({ error: "This campaign isn't running." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
