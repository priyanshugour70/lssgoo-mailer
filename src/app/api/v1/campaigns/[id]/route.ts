import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { getCampaignDetail } from "@/service/mailer/campaigns";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  status: z.enum(["sent", "skipped", "failed"]).optional().catch(undefined),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const detail = await getCampaignDetail(auth.user.id, id, query);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail);
}
