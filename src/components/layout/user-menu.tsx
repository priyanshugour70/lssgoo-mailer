"use client";

import { LogOutIcon } from "lucide-react";

import { signOut } from "@/action/auth/sign-out";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-2 backdrop-blur-sm",
        compact ? "mb-4 w-full" : "shadow-sm",
      )}
    >
      <Avatar size="sm">
        {user.imageUrl ? (
          <AvatarImage src={user.imageUrl} alt={user.name} />
        ) : null}
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      {!compact ? (
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </form>
      ) : null}
    </div>
  );
}