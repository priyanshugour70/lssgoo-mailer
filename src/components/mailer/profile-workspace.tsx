"use client";

import { Page, PageHeader } from "@/components/app/page-header";
import { UserAvatar } from "@/components/app/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

export function ProfileWorkspace() {
  const user = useCurrentUser();
  return (
    <Page>
      <PageHeader title="Profile" description="Managed by your Google account and refreshed each time you sign in." />
      <Card className="max-w-xl">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <UserAvatar name={user.name} imageUrl={user.imageUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="success" className="ml-auto shrink-0">Google verified</Badge>
          </div>
          <dl className="divide-y divide-border rounded-xl border border-border text-sm">
            <Row label="First name" value={user.firstName} />
            <Row label="Last name" value={user.lastName} />
            <Row label="Email" value={user.email} />
          </dl>
          <p className="text-xs text-muted-foreground">
            To change your name, photo or email, update your Google account and sign in again.
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value || "—"}</dd>
    </div>
  );
}
