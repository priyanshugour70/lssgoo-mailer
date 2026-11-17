import { after, NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { getCampaignDetail, runCampaign } from "@/service/mailer/campaigns";

export const maxDuration = 300;

const bodySchema = z.object({ resume: z.boolean().optional() });

/** Starts a draft campaign, or resumes a stalled / retries a failed one. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const { resume } = bodySchema.parse(await request.json().catch(() => ({})));

  const detail = await getCampaignDetail(auth.user.id, id);
  if (!detail) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  const { campaign } = detail;
  if (campaign.status === "running" && !campaign.stalled) {
    return NextResponse.json({ error: "This campaign is still sending." }, { status: 409 });
  }
  if (resume && campaign.status !== "failed" && !campaign.stalled) {
    return NextResponse.json(
      { error: "Only stalled or failed campaigns can be resumed." },
      { status: 409 },
    );
  }
  if (!resume && campaign.status !== "draft") {
    return NextResponse.json(
      { error: "This campaign has already been sent. Use retry to resend failures." },
      { status: 409 },
    );
  }

  const userId = auth.user.id;
  after(() => runCampaign(userId, id, { resume }));
  return NextResponse.json({ campaignId: id, async: true, status: "running" }, { status: 202 });
}
