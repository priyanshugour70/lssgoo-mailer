import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import {
  createAccessRequest,
  listIncomingRequests,
  listMyRequests,
} from "@/service/mailer/sharing";

const bodySchema = z.object({
  ownerId: z.string().uuid(),
  message: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "incoming") {
    const requests = await listIncomingRequests(auth.user.id);
    return NextResponse.json({ requests });
  }
  const requests = await listMyRequests(auth.user.id);
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const row = await createAccessRequest(
      auth.user.id,
      parsed.data.ownerId,
      parsed.data.message,
    );
    return NextResponse.json({ request: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}