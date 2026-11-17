import "server-only";

import { z } from "zod";

const schema = z.object({
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  AUTH_SESSION_SECRET: z.string().min(32),
  AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
  AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
});

const requiredKeys = [
  "APP_URL",
  "DATABASE_URL",
  "AUTH_SESSION_SECRET",
  "AUTH_GOOGLE_CLIENT_ID",
  "AUTH_GOOGLE_CLIENT_SECRET",
] as const;

export type ServerEnv = z.infer<typeof schema>;

export function missingAuthConfig(source: NodeJS.ProcessEnv = process.env) {
  return requiredKeys.filter((key) => !source[key]);
}

export function readServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = schema.parse({
    APP_URL: source.APP_URL,
    DATABASE_URL: source.DATABASE_URL,
    AUTH_SESSION_SECRET: source.AUTH_SESSION_SECRET,
    AUTH_GOOGLE_CLIENT_ID: source.AUTH_GOOGLE_CLIENT_ID,
    AUTH_GOOGLE_CLIENT_SECRET: source.AUTH_GOOGLE_CLIENT_SECRET,
  });
  return {
    ...parsed,
    APP_URL: parsed.APP_URL.replace(/\/$/, ""),
  };
}