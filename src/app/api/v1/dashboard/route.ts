import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { getDashboardPayload } from "@/service/mailer/dashboard";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const dashboard = await getDashboardPayload(auth.user.id);
  return NextResponse.json(dashboard);
}