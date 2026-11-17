import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/types/auth/principal";

const userSelection = {
  id: users.id,
  email: users.email,
  name: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  imageUrl: users.imageUrl,
  googleSub: users.googleSub,
};

function displayName(input: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const joined = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (joined) return joined;
  const trimmed = input.name?.trim();
  if (trimmed) return trimmed;
  return input.email.split("@")[0] ?? "User";
}

function splitNames(name: string | null, first: string | null, last: string | null) {
  if (first || last) {
    return {
      firstName: first?.trim() || null,
      lastName: last?.trim() || null,
    };
  }
  const trimmed = name?.trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

export async function upsertGoogleUser(input: {
  sub: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}): Promise<CurrentUser> {
  const db = getDb();
  const names = splitNames(input.name, input.firstName, input.lastName);
  const name = displayName({ ...input, ...names });

  const patch = {
    email: input.email,
    name,
    firstName: names.firstName,
    lastName: names.lastName,
    imageUrl: input.imageUrl,
    updatedAt: new Date(),
  };

  const byGoogle = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.googleSub, input.sub))
    .limit(1);

  if (byGoogle[0]) {
    const [user] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, byGoogle[0].id))
      .returning(userSelection);
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
      .set({ ...patch, googleSub: input.sub })
      .where(eq(users.id, byEmail[0].id))
      .returning(userSelection);
    if (!user) throw new Error("User update failed.");
    return user;
  }

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      name,
      firstName: names.firstName,
      lastName: names.lastName,
      imageUrl: input.imageUrl,
      googleSub: input.sub,
    })
    .returning(userSelection);

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
    .select(userSelection)
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