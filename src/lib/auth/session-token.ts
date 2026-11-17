import { SignJWT, jwtVerify } from "jose";

import { SESSION_TTL_MS } from "@/lib/auth/constants";
import type { SessionTokenPayload } from "@/types/auth/principal";

function signingKey() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function sessionExpiry(now = Date.now()) {
  return new Date(now + SESSION_TTL_MS);
}

export async function sealSession(
  payload: SessionTokenPayload,
  expiresAt: Date,
) {
  const key = signingKey();
  if (!key) return null;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
}

export async function openSession(token: string | undefined) {
  const key = signingKey();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (
      typeof payload.sessionId !== "string" ||
      typeof payload.userId !== "string"
    ) {
      return null;
    }
    return {
      sessionId: payload.sessionId,
      userId: payload.userId,
    } satisfies SessionTokenPayload;
  } catch {
    return null;
  }
}
