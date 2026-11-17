import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import {
  openSession,
  sealSession,
  sessionExpiry,
} from "@/lib/auth/session-token";
import {
  insertSession,
  revokeSession,
} from "@/service/auth/identity";

export async function startSession(userId: string) {
  const expiresAt = sessionExpiry();
  const session = await insertSession(userId, expiresAt);
  const token = await sealSession(
    { sessionId: session.id, userId },
    expiresAt,
  );
  if (!token) {
    throw new Error("AUTH_SESSION_SECRET is not set");
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value);
  if (opened) {
    await revokeSession(opened.sessionId);
  }
  jar.delete(SESSION_COOKIE);
}
