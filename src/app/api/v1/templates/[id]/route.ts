import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { z } from "zod";

import { deleteTemplate, updateTemplate } from "@/service/mailer/templates";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const result = await deleteTemplate(auth.user.id, id);
  if (result === "not_found") {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  if (result === "in_use") {
    return NextResponse.json(
      { error: "This template is used by past campaigns and can't be deleted." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  name: z.string().min(1).max(200),
  format: z.enum(["html", "text"]),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  pdfFileId: z.string().uuid().optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const template = await updateTemplate(auth.user.id, id, parsed.data);
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ template });
}
