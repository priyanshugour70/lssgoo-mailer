"use client";

import Link from "next/link";
import { LogOutIcon, UserRoundIcon } from "lucide-react";

import { signOut } from "@/action/auth/sign-out";
import { UserAvatar } from "@/components/app/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { cn } from "@/lib/utils";

/** Avatar trigger. `expanded` shows name/email next to it (sidebar footer). */
export function AccountMenu({
  expanded = false,
  side = "bottom",
}: {
  expanded?: boolean;
  side?: "bottom" | "top";
}) {
  const user = useCurrentUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          expanded ? "w-full p-2 hover:bg-sidebar-accent" : "rounded-full",
        )}
      >
        <UserAvatar name={user.name} imageUrl={user.imageUrl} />
        {expanded ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={expanded ? "start" : "end"} side={side} className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <UserRoundIcon data-icon="inline-start" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOutIcon data-icon="inline-start" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
