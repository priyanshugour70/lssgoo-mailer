"use client";

import { PageHeader } from "@/components/mailer/page-header";
import { MailerScreen } from "@/components/mailer/ui/screen";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

export function ProfileWorkspace() {
  const user = useCurrentUser();
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <MailerScreen>
      <PageHeader title="Your profile" description="Synced from Google OAuth on every sign-in." />

      <Card className="overflow-hidden border-border/70">
        <div className="mailer-surface-panel h-20" />
        <CardContent className="relative flex flex-col items-center gap-3 pt-0 pb-6">
          <Avatar size="lg" className="-mt-10 ring-4 ring-card">
            {user.imageUrl ? <AvatarImage src={user.imageUrl} alt={user.name} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="secondary" className="border-brand-green/30 bg-brand-green-muted">
            Google verified
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border/60 py-2">
          <Detail label="First name" value={user.firstName ?? "—"} />
          <Detail label="Last name" value={user.lastName ?? "—"} />
          <Detail label="Google profile ID" value={user.googleSub} mono />
          <Detail label="Profile photo URL" value={user.imageUrl ?? "—"} mono />
        </CardContent>
      </Card>
    </MailerScreen>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-2 py-3 first:pt-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`text-sm break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}