import { after, NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { createCampaign, listCampaigns, runCampaign } from "@/service/mailer/campaigns";

const bodySchema = z.object({
  name: z.string().min(1),
  templateId: z.string().uuid(),
  smtpProfileId: z.string().uuid(),
  recipientMode: z.enum(["all", "filter", "pick"]),
  companyFilter: z.string().optional(),
  skipAlreadySent: z.boolean().optional(),
  contactIds: z.array(z.string().uuid()).optional(),
  sendNow: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const campaigns = await listCampaigns(auth.user.id);
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { sendNow, ...input } = parsed.data;
  const campaign = await createCampaign(auth.user.id, input);

  if (sendNow) {
    const userId = auth.user.id;
    const campaignId = campaign.id;
    after(() => runCampaign(userId, campaignId));
    return NextResponse.json(
      { campaign: { ...campaign, status: "running" }, async: true },
      { status: 202 },
    );
  }

  return NextResponse.json({ campaign }, { status: 201 });
}