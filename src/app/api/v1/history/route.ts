import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { listCampaignHistory } from "@/service/mailer/campaigns";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const history = await listCampaignHistory(auth.user.id);
  return NextResponse.json({ history });
}