import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  contactAccessGrants,
  contactAccessRequests,
  contacts,
  users,
} from "@/lib/db/schema";

export async function createAccessRequest(
  requesterId: string,
  ownerId: string,
  message?: string,
) {
  if (requesterId === ownerId) {
    throw new Error("You cannot request your own contacts.");
  }
  const db = getDb();
  const [granted] = await db
    .select({ id: contactAccessGrants.id })
    .from(contactAccessGrants)
    .where(
      and(
        eq(contactAccessGrants.ownerId, ownerId),
        eq(contactAccessGrants.viewerId, requesterId),
      ),
    )
    .limit(1);
  if (granted) throw new Error("You already have access to this list.");
  const [pending] = await db
    .select({ id: contactAccessRequests.id })
    .from(contactAccessRequests)
    .where(
      and(
        eq(contactAccessRequests.ownerId, ownerId),
        eq(contactAccessRequests.requesterId, requesterId),
        eq(contactAccessRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (pending) throw new Error("A request is already waiting for approval.");
  const [row] = await db
    .insert(contactAccessRequests)
    .values({
      requesterId,
      ownerId,
      message: message?.trim() || null,
      status: "pending",
    })
    .returning();
  return row;
}

export async function listIncomingRequests(ownerId: string) {
  const db = getDb();
  return db
    .select({
      request: contactAccessRequests,
      requester: {
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
      },
    })
    .from(contactAccessRequests)
    .innerJoin(users, eq(users.id, contactAccessRequests.requesterId))
    .where(
      and(
        eq(contactAccessRequests.ownerId, ownerId),
        eq(contactAccessRequests.status, "pending"),
      ),
    )
    .orderBy(contactAccessRequests.createdAt);
}

export async function listMyRequests(requesterId: string) {
  const db = getDb();
  return db
    .select({
      request: contactAccessRequests,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
      },
    })
    .from(contactAccessRequests)
    .innerJoin(users, eq(users.id, contactAccessRequests.ownerId))
    .where(eq(contactAccessRequests.requesterId, requesterId))
    .orderBy(contactAccessRequests.createdAt);
}

export async function resolveAccessRequest(
  requestId: string,
  ownerId: string,
  decision: "accepted" | "rejected",
) {
  const db = getDb();
  const [request] = await db
    .update(contactAccessRequests)
    .set({ status: decision, resolvedAt: new Date() })
    .where(
      and(
        eq(contactAccessRequests.id, requestId),
        eq(contactAccessRequests.ownerId, ownerId),
        eq(contactAccessRequests.status, "pending"),
      ),
    )
    .returning();

  if (!request) return null;

  if (decision === "accepted") {
    await db
      .insert(contactAccessGrants)
      .values({
        ownerId: request.ownerId,
        viewerId: request.requesterId,
      })
      .onConflictDoNothing();
  }

  return request;
}

export async function listGrantsForViewer(viewerId: string) {
  const db = getDb();
  return db
    .select({
      grant: contactAccessGrants,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
      },
    })
    .from(contactAccessGrants)
    .innerJoin(users, eq(users.id, contactAccessGrants.ownerId))
    .where(eq(contactAccessGrants.viewerId, viewerId));
}

export async function listSharedContacts(viewerId: string) {
  const db = getDb();
  return db
    .select({
      contact: contacts,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(contactAccessGrants)
    .innerJoin(contacts, eq(contacts.ownerId, contactAccessGrants.ownerId))
    .innerJoin(users, eq(users.id, contactAccessGrants.ownerId))
    .where(eq(contactAccessGrants.viewerId, viewerId))
    .orderBy(contacts.email);
}