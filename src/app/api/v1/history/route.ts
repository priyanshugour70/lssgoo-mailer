import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { listCampaignHistory } from "@/service/mailer/campaigns";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  status: z.enum(["sent", "skipped", "failed"]).optional().catch(undefined),
  q: z.string().max(200).optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = querySchema.parse(params);
  const result = await listCampaignHistory(auth.user.id, query);
  return NextResponse.json(result);
}
