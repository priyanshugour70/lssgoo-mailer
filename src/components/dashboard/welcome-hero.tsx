"use client";

import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { CurrentUser } from "@/types/auth/principal";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function WelcomeHero({ user }: { user: CurrentUser }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-500 fill-mode-both">
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="ring-2 ring-brand-blue/35 ring-offset-2 ring-offset-background">
          {user.imageUrl ? (
            <AvatarImage src={user.imageUrl} alt={user.name} />
          ) : null}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <Badge
            variant="secondary"
            className="w-fit border-brand-parrot/25 bg-brand-parrot-muted text-brand-ink"
          >
            Workspace active
          </Badge>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            Hi, {user.firstName ?? user.name.split(" ")[0]}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Your mailer SaaS workspace is synced. Timestamps below follow your
        device clock and timezone.
      </p>
    </section>
  );
}