import { connection, NextResponse } from "next/server";

import {
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import {
  exchangeGoogleCode,
  googleRedirectUri,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { sessionExpiry, sealSession } from "@/lib/auth/session-token";
import { missingAuthConfig, readServerEnv } from "@/lib/env/server";
import { AppError } from "@/lib/http/errors";
import { insertSession, upsertGoogleUser } from "@/service/auth/identity";

export async function GET(request: Request) {
  await connection();

  const requestUrl = new URL(request.url);
  const origin = process.env.APP_URL || requestUrl.origin;

  const fail = (code: string) => {
    const response = NextResponse.redirect(new URL(`/sign-in?error=${code}`, origin));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_NONCE_COOKIE);
    return response;
  };

  if (missingAuthConfig().length > 0) return fail("config");

  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const cookieState = readCookie(request, OAUTH_STATE_COOKIE);
  const nonce = readCookie(request, OAUTH_NONCE_COOKIE);

  if (!state || !code || !cookieState || state !== cookieState || !nonce) {
    return fail("oauth");
  }

  try {
    const config = readServerEnv();
    const tokens = await exchangeGoogleCode({
      code,
      clientId: config.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: config.AUTH_GOOGLE_CLIENT_SECRET,
      redirectUri: googleRedirectUri(config.APP_URL),
    });
    if (!tokens.id_token) return fail("oauth");

    const identity = await verifyGoogleIdToken({
      idToken: tokens.id_token,
      audience: config.AUTH_GOOGLE_CLIENT_ID,
      nonce,
    });

    const user = await upsertGoogleUser({
      sub: identity.sub,
      email: identity.email,
      name: identity.name,
      firstName: identity.firstName,
      lastName: identity.lastName,
      imageUrl: identity.imageUrl,
    });

    const expiresAt = sessionExpiry();
    const session = await insertSession(user.id, expiresAt);
    const sealed = await sealSession(
      { sessionId: session.id, userId: user.id },
      expiresAt,
    );
    if (!sealed) return fail("config");

    const response = NextResponse.redirect(new URL("/", config.APP_URL));
    response.cookies.set(SESSION_COOKIE, sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_NONCE_COOKIE);
    return response;
  } catch (error) {
    const reason =
      error instanceof AppError && error.code === "unauthorized"
        ? "unverified"
        : "oauth";
    return fail(reason);
  }
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}