import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { getCampaignStatus } from "@/service/mailer/dashboard";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const campaign = await getCampaignStatus(auth.user.id, id);
  if (!campaign) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}