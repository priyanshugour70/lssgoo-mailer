import { connection } from "next/server";

import { pingDatabase } from "@/lib/db/client";
import type { HealthResponse } from "@/types/api/health";

export async function GET() {
  await connection();
  const database = await pingDatabase();
  const body: HealthResponse = { database };
  return Response.json(body, { status: database === "up" ? 200 : 503 });
}
