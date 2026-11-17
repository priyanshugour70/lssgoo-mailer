import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

function postgresOptions(url: string, max: number) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  const sslMode =
    parsed.searchParams.get("sslmode") ??
    (local ? "disable" : "require");

  const ssl: false | "require" | "prefer" =
    sslMode === "disable" || sslMode === "false" || sslMode === "allow"
      ? false
      : sslMode === "prefer"
        ? "prefer"
        : "require";

  return {
    max,
    prepare: false,
    ...(ssl === false ? {} : { ssl }),
  };
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForDb.sql) {
    globalForDb.sql = postgres(url, postgresOptions(url, 10));
  }
  return drizzle(globalForDb.sql, { schema });
}

export async function pingDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) return "unconfigured" as const;
  const sql = postgres(url, postgresOptions(url, 1));
  try {
    await sql`select 1`;
    return "up" as const;
  } catch {
    return "down" as const;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
