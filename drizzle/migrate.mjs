import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

function postgresOptions(connectionUrl) {
  const parsed = new URL(connectionUrl);
  const host = parsed.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  const sslMode =
    parsed.searchParams.get("sslmode") ?? (local ? "disable" : "require");
  const ssl =
    sslMode === "disable" || sslMode === "false" || sslMode === "allow"
      ? false
      : sslMode === "prefer"
        ? "prefer"
        : "require";
  return { max: 1, prepare: false, ...(ssl === false ? {} : { ssl }) };
}

const directory = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(directory)
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort();

const sql = postgres(url, postgresOptions(url));

try {
  for (const file of files) {
    await sql.unsafe(readFileSync(join(directory, file), "utf8"));
    console.log(`applied ${file}`);
  }
} finally {
  await sql.end();
}