import { connection } from "next/server";

import { readPrincipal } from "@/lib/auth/dal";

export async function GET() {
  await connection();
  const user = await readPrincipal();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json({ user });
}
