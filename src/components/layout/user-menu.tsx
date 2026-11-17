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

export function UserMenu({
  compact = false,
  placement = "main",
}: {
  compact?: boolean;
  placement?: "main" | "header";
}) {
  const user = useCurrentUser();
  const inHeader = placement === "header";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border p-1.5 pl-2",
        inHeader
          ? "max-w-md border-border bg-card text-foreground shadow-sm"
          : "border-border/60 bg-card/90 text-foreground shadow-sm backdrop-blur-sm",
        compact ? "mb-4 w-full" : inHeader ? "min-w-0" : "shadow-sm",
      )}
    >
      <Avatar size="sm" className={cn(inHeader && "ring-1 ring-brand-green/35")}>
        {user.imageUrl ? (
          <AvatarImage src={user.imageUrl} alt={user.name} />
        ) : null}
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {user.email}
        </p>
      </div>
      {!compact ? (
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className={cn(
              inHeader &&
                "shrink-0 border-brand-green/30 bg-brand-green-muted/50 hover:bg-brand-green-muted",
            )}
          >
            <LogOutIcon data-icon="inline-start" className="size-4" />
            <span className="sr-only md:not-sr-only md:inline">Sign out</span>
          </Button>
        </form>
      ) : null}
    </div>
  );
}