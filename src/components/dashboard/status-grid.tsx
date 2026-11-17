"use client";

import {
  BadgeCheckIcon,
  CloudIcon,
  SmartphoneIcon,
} from "lucide-react";

import { IconWell } from "@/components/ui/icon-well";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

const items = [
  {
    title: "Mobile ready",
    body: "Layouts and controls are sized for thumbs first.",
    tone: "blue" as const,
    icon: SmartphoneIcon,
  },
  {
    title: "Live session",
    body: "Your Google account is active on this device.",
    tone: "green" as const,
    icon: BadgeCheckIcon,
  },
  {
    title: "SaaS workspace",
    body: "Cloud Postgres backs accounts and sessions.",
    tone: "matte" as const,
    icon: CloudIcon,
  },
];

export function StatusGrid() {
  const user = useCurrentUser();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <Card
          key={item.title}
          className="animate-in fade-in slide-in-from-bottom-2 border-none bg-muted/40 shadow-sm duration-500 fill-mode-both"
          style={{ animationDelay: `${120 + index * 80}ms` }}
        >
          <CardContent className="flex gap-3">
            <IconWell icon={item.icon} tone={item.tone} />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card
        className="mailer-surface-panel animate-in fade-in slide-in-from-bottom-2 border border-border/60 shadow-sm duration-500 fill-mode-both sm:col-span-2 lg:col-span-3"
        style={{ animationDelay: "360ms" }}
      >
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Signed in</p>
          <p className="text-sm text-muted-foreground">
            {user.name} · {user.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}