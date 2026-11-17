import "server-only";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import {
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_JWKS_URL,
  GOOGLE_TOKEN_URL,
} from "@/lib/auth/constants";
import { AppError } from "@/lib/http/errors";

const googleKeys = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export type VerifiedGoogleIdentity = {
  sub: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

type TokenResponse = {
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
};

export function googleRedirectUri(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/api/v1/auth/google/callback`;
}

export function googleAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
}) {
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

async function postToken(body: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || payload.error) {
    throw new AppError("Google token exchange failed", "upstream");
  }
  return payload;
}

export async function exchangeGoogleCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  return postToken(
    new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  );
}

function claimString(payload: JWTPayload, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

export async function verifyGoogleIdToken(input: {
  idToken: string;
  audience: string;
  nonce: string;
}) {
  const { payload } = await jwtVerify(input.idToken, googleKeys, {
    audience: input.audience,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  if (payload.nonce !== input.nonce) {
    throw new AppError("Google sign-in nonce did not match", "unauthorized");
  }
  const email = claimString(payload, "email");
  const sub = payload.sub;
  const verified =
    payload.email_verified === true || payload.email_verified === "true";
  if (!email || !sub || !verified) {
    throw new AppError("Google account email is not verified", "unauthorized");
  }
  const given = claimString(payload, "given_name");
  const family = claimString(payload, "family_name");
  return {
    sub,
    email: email.toLowerCase(),
    name: claimString(payload, "name"),
    firstName: given,
    lastName: family,
    imageUrl: claimString(payload, "picture"),
  } satisfies VerifiedGoogleIdentity;
}