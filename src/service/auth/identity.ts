import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/types/auth/principal";

function displayName(name: string | null, email: string) {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] ?? "User";
}

export async function upsertGoogleUser(input: {
  sub: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
}): Promise<CurrentUser> {
  const db = getDb();
  const name = displayName(input.name, input.email);

  const byGoogle = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.googleSub, input.sub))
    .limit(1);

  if (byGoogle[0]) {
    const [user] = await db
      .update(users)
      .set({
        email: input.email,
        name,
        imageUrl: input.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, byGoogle[0].id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        imageUrl: users.imageUrl,
      });
    if (!user) throw new Error("User update failed.");
    return user;
  }

  const byEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (byEmail[0]) {
    const [user] = await db
      .update(users)
      .set({
        googleSub: input.sub,
        name,
        imageUrl: input.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, byEmail[0].id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        imageUrl: users.imageUrl,
      });
    if (!user) throw new Error("User update failed.");
    return user;
  }

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      name,
      imageUrl: input.imageUrl,
      googleSub: input.sub,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      imageUrl: users.imageUrl,
    });

  if (!user) throw new Error("User was not created.");
  return user;
}

export async function insertSession(userId: string, expiresAt: Date) {
  const db = getDb();
  const [session] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id });

  if (!session) {
    throw new Error("Session was not created.");
  }

  return session;
}

export async function revokeSession(sessionId: string) {
  const db = getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

export async function findActiveUser(
  sessionId: string,
  userId: string,
): Promise<CurrentUser | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      imageUrl: users.imageUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return row ?? null;
}