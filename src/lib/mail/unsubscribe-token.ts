import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function key() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SESSION_SECRET is not set.");
  return `unsub:${secret}`;
}

function sign(body: string) {
  return createHmac("sha256", key()).update(body).digest("base64url");
}

/** Signed, tamper-proof token naming one sender and one recipient. */
export function makeUnsubscribeToken(userId: string, email: string) {
  const body = Buffer.from(JSON.stringify({ u: userId, e: email.toLowerCase() })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readUnsubscribeToken(token: string | null | undefined) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: unknown; e?: unknown };
    if (typeof parsed.u !== "string" || typeof parsed.e !== "string") return null;
    return { userId: parsed.u, email: parsed.e };
  } catch {
    return null;
  }
}

export function unsubscribeUrl(userId: string, email: string) {
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  return `${base}/unsubscribe?t=${makeUnsubscribeToken(userId, email)}`;
}
