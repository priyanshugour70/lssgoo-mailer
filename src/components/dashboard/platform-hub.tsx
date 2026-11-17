"use client";

import Link from "next/link";
import {
  HistoryIcon,
  MailIcon,
  SendIcon,
  Settings2Icon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import { LiveClockPanel } from "@/components/dashboard/live-clock";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { EmptyState } from "@/components/mailer/ui/empty-state";
import { ListSkeleton } from "@/components/mailer/ui/list-skeleton";
import { IconWell } from "@/components/ui/icon-well";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

const links = [
  {
    href: "/contacts",
    title: "Contacts",
    body: "Company emails you own and import.",
    tone: "blue" as const,
    icon: MailIcon,
  },
  {
    href: "/people",
    title: "People",
    body: "Users, access requests, shared lists.",
    tone: "green" as const,
    icon: UsersIcon,
  },
  {
    href: "/send",
    title: "Send",
    body: "Audience, template, personal send loop.",
    tone: "matte" as const,
    icon: SendIcon,
  },
  {
    href: "/setup",
    title: "Setup",
    body: "SMTP validate, templates, PDF attach.",
    tone: "black" as const,
    icon: Settings2Icon,
  },
  {
    href: "/history",
    title: "History",
    body: "Sent, skipped, failed — full ledger.",
    tone: "blue" as const,
    icon: HistoryIcon,
  },
  {
    href: "/profile",
    title: "Profile",
    body: "Google name, email, profile URL.",
    tone: "green" as const,
    icon: UserRoundIcon,
  },
] as const;

type StatsResponse = {
  stats: {
    contacts: number;
    templates: number;
    smtpProfiles: number;
    smtpValidated: number;
    campaigns: number;
    sends: number;
  };
};

export function PlatformHub() {
  const user = useCurrentUser();
  const { data, loading } = useMailerFetch<StatsResponse>("/api/v1/stats");

  const readyToSend =
    (data?.stats.smtpValidated ?? 0) > 0 &&
    (data?.stats.templates ?? 0) > 0 &&
    (data?.stats.contacts ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <WelcomeHero user={user} />
      <LiveClockPanel />

      {loading ? (
        <ListSkeleton rows={2} />
      ) : (
        <Card className="mailer-surface-panel border border-border/60">
          <CardContent className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
            <Stat label="Contacts" value={data?.stats.contacts ?? 0} />
            <Stat label="Templates" value={data?.stats.templates ?? 0} />
            <Stat label="SMTP ready" value={data?.stats.smtpValidated ?? 0} />
            <Stat label="Campaigns" value={data?.stats.campaigns ?? 0} />
            <Stat label="Sends logged" value={data?.stats.sends ?? 0} />
            <div className="col-span-2 flex items-center sm:col-span-1">
              <Badge
                variant="secondary"
                className={
                  readyToSend
                    ? "border-brand-green/30 bg-brand-green-muted text-brand-ink"
                    : "border-border"
                }
              >
                {readyToSend ? "Ready to send" : "Finish setup first"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block h-full">
              <Card className="h-full border-border/70 shadow-sm transition active:scale-[0.99]">
                <CardContent className="flex gap-3 py-4">
                  <IconWell icon={Icon} tone={item.tone} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold group-hover:text-brand-blue">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {!readyToSend && !loading ? (
        <EmptyState
          icon={Settings2Icon}
          title="Complete your workspace"
          description="Add SMTP (and validate), at least one template, and contacts before sending."
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}