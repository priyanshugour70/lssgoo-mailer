import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api/require-user";
import { listGrantsForViewer, listSharedContacts } from "@/service/mailer/sharing";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const [grants, shared] = await Promise.all([
    listGrantsForViewer(auth.user.id),
    listSharedContacts(auth.user.id),
  ]);
  return NextResponse.json({ grants, shared });
}