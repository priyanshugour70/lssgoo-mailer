import "server-only";

import { ne } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { PublicUser } from "@/types/auth/principal";

export async function listPeople(excludeUserId: string): Promise<PublicUser[]> {
  const db = getDb();
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
    })
    .from(users)
    .where(ne(users.id, excludeUserId))
    .orderBy(users.name);
}