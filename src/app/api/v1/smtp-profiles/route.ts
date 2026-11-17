import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import {
  createSmtpProfile,
  listSmtpProfiles,
} from "@/service/mailer/smtp-profiles";

const bodySchema = z.object({
  label: z.string().optional(),
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean(),
  username: z.string().min(1),
  password: z.string().min(1),
  fromName: z.string().optional(),
  fromEmail: z.string().email(),
});

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const profiles = await listSmtpProfiles(auth.user.id);
  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const profile = await createSmtpProfile(auth.user.id, parsed.data);
  return NextResponse.json({ profile }, { status: 201 });
}