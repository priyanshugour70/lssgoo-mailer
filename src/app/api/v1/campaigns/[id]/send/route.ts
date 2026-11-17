import { after, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { runCampaign } from "@/service/mailer/campaigns";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const userId = auth.user.id;
  after(() => runCampaign(userId, id));
  return NextResponse.json({ campaignId: id, async: true, status: "running" });
}