import "server-only";

import { connection } from "next/server";
import { NextResponse } from "next/server";

import { readPrincipal } from "@/lib/auth/dal";

export async function requireApiUser() {
  await connection();
  const user = await readPrincipal();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    } as const;
  }
  return { user, response: null } as const;
}