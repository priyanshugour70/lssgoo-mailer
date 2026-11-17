import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { createTemplate, listTemplates } from "@/service/mailer/templates";

const bodySchema = z.object({
  name: z.string().min(1),
  format: z.enum(["html", "text"]),
  subject: z.string().min(1),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  pdfFileId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const templates = await listTemplates(auth.user.id);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const template = await createTemplate(auth.user.id, parsed.data);
  return NextResponse.json({ template }, { status: 201 });
}