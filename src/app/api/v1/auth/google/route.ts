import { randomBytes } from "node:crypto";

import { connection, NextResponse } from "next/server";

import {
  OAUTH_COOKIE_TTL_SECONDS,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth/constants";
import { googleAuthorizeUrl, googleRedirectUri } from "@/lib/auth/google";
import { missingAuthConfig, readServerEnv } from "@/lib/env/server";

export async function GET(request: Request) {
  await connection();
  if (missingAuthConfig().length > 0) {
    return NextResponse.redirect(new URL("/sign-in?error=config", request.url));
  }

  const env = readServerEnv();
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const destination = googleAuthorizeUrl({
    clientId: env.AUTH_GOOGLE_CLIENT_ID,
    redirectUri: googleRedirectUri(env.APP_URL),
    state,
    nonce,
  });

  const response = NextResponse.redirect(destination);
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_COOKIE_TTL_SECONDS,
  };
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookie);
  response.cookies.set(OAUTH_NONCE_COOKIE, nonce, cookie);
  return response;
}