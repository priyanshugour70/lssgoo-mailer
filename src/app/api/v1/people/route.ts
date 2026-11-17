import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { listPeople } from "@/service/mailer/directory";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const people = await listPeople(auth.user.id);
  return NextResponse.json({ people });
}