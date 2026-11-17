import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { deleteTemplate } from "@/service/mailer/templates";

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
