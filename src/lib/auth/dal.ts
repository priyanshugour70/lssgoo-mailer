import "server-only";

import { cacheLife } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { openSession } from "@/lib/auth/session-token";
import { findActiveUser } from "@/service/auth/identity";
import type { CurrentUser } from "@/types/auth/principal";

export async function readPrincipal(): Promise<CurrentUser | null> {
  "use cache: private";
  cacheLife({ stale: 30 });

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const opened = await openSession(token);
  if (!opened) return null;

  try {
    return await findActiveUser(opened.sessionId, opened.userId);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const user = await readPrincipal();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
