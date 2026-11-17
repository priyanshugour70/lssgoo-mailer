import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { savePdfUpload } from "@/service/mailer/files";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  try {
    const row = await savePdfUpload(auth.user.id, file);
    return NextResponse.json({ file: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}