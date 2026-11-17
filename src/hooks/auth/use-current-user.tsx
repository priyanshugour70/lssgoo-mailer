"use client";

import { createContext, use } from "react";

import type { CurrentUser } from "@/types/auth/principal";

const UserContext = createContext<Promise<CurrentUser> | null>(null);

export function UserProvider({
  userPromise,
  children,
}: {
  userPromise: Promise<CurrentUser>;
  children: React.ReactNode;
}) {
  return <UserContext value={userPromise}>{children}</UserContext>;
}

export function useCurrentUser() {
  const userPromise = use(UserContext);
  if (!userPromise) {
    throw new Error("useCurrentUser must be used within a UserProvider");
  }
  return use(userPromise);
}
