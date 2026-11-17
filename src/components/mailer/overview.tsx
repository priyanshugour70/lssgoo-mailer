"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowRightIcon, CheckCircle2Icon, CircleIcon, SendIcon } from "lucide-react";

import { ErrorState } from "@/components/app/empty-state";
import { Page, PageHeader, Section } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { formatRelative, numberFormat } from "@/lib/client/format";
import { cn } from "@/lib/utils";

type Dashboard = {
  stats: {
    contacts: number;
    templates: number;
    smtpValidated: number;
    emailsSent: number;
    emailsFailed: number;
    emailsSkipped: number;
  };
  sendsByDay: { day: string; total: number; sent: number; failed: number }[];
  activeCampaigns: {
    id: string;
    name: string;
    totalRecipients: number | null;
    processedCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  }[];
  recentCampaigns: {
    id: string;
    name: string;
    status: string;
    totalRecipients: number | null;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    createdAt: string;
  }[];
  recentSends: {
    id: string;
    recipientEmail: string;
    subject: string;
    status: string;
    sentAt: string;
  }[];
};

const chartConfig = {
  sent: { label: "Sent", color: "var(--chart-1)" },
  failed: { label: "Failed", color: "var(--chart-2)" },
} satisfies ChartConfig;

function localDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function Overview() {
  const user = useCurrentUser();
  const { data, loading, error, reload } = useMailerFetch<Dashboard>("/api/v1/dashboard");
  const running = (data?.activeCampaigns.length ?? 0) > 0;

  // Poll quickly while a campaign runs, slowly otherwise; pause when hidden.
  useEffect(() => {
    const interval = window.setInterval(
      () => {
        if (document.visibilityState === "visible") void reload();
      },
      running ? 2500 : 20000,
    );
    return () => window.clearInterval(interval);
  }, [running, reload]);

  const chartData = useMemo(() => {
    const byDay = new Map((data?.sendsByDay ?? []).map((row) => [row.day, row]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const row = byDay.get(localDayKey(date));
      return {
        day: date.toLocaleDateString(undefined, { weekday: "short" }),
        sent: Number(row?.sent ?? 0),
        failed: Number(row?.failed ?? 0),
      };
    });
  }, [data?.sendsByDay]);

  const hasActivity = chartData.some((row) => row.sent + row.failed > 0);
  const firstName = user.firstName ?? user.name.split(" ")[0];
  const stats = data?.stats;
  const setupSteps = stats
    ? [
        { done: stats.smtpValidated > 0, label: "Connect and verify a sender", href: "/setup" },
        { done: stats.templates > 0, label: "Create a message template", href: "/setup?tab=templates" },
        { done: stats.contacts > 0, label: "Add your contacts", href: "/contacts" },
      ]
    : [];
  const setupIncomplete = setupSteps.some((step) => !step.done);

  return (
    <Page>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your sending activity at a glance."
        actions={
          <Link href="/send" className={cn(buttonVariants(), "max-sm:hidden")}>
            <SendIcon data-icon="inline-start" />
            New campaign
          </Link>
        }
      />

      {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

      {stats && setupIncomplete ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">Get ready to send</h2>
              <p className="text-sm text-muted-foreground">
                {setupSteps.filter((s) => s.done).length} of {setupSteps.length} done
              </p>
            </div>
            <ul className="flex flex-col">
              {setupSteps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-1 text-sm hover:bg-muted"
                  >
                    {step.done ? (
                      <CheckCircle2Icon aria-hidden className="size-5 text-success" />
                    ) : (
                      <CircleIcon aria-hidden className="size-5 text-muted-foreground" />
                    )}
                    <span className={cn("flex-1", step.done && "text-muted-foreground line-through")}>
                      {step.label}
                    </span>
                    {step.done ? null : <ArrowRightIcon aria-hidden className="size-4 text-muted-foreground" />}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Emails sent" value={stats?.emailsSent} href="/history?status=sent" loading={loading} />
        <Stat
          label="Failed"
          value={stats?.emailsFailed}
          href="/history?status=failed"
          loading={loading}
          tone={stats && stats.emailsFailed > 0 ? "danger" : undefined}
        />
        <Stat label="Contacts" value={stats?.contacts} href="/contacts" loading={loading} />
        <Stat label="Verified senders" value={stats?.smtpValidated} href="/setup" loading={loading} />
      </section>

      {running ? (
        <Section title="Sending now" description="Updates automatically.">
          <div className="flex flex-col gap-3">
            {data?.activeCampaigns.map((campaign) => {
              const total = campaign.totalRecipients ?? 0;
              const progress = total ? Math.round((campaign.processedCount / total) * 100) : 0;
              return (
                <Card key={campaign.id}>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {campaign.processedCount}/{total || "…"}
                      </span>
                    </div>
                    <Progress value={progress} aria-label={`${campaign.name} progress`} />
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {campaign.sentCount} sent · {campaign.skippedCount} skipped · {campaign.failedCount} failed
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Section title="Last 7 days" description="Emails sent and failed per day">
            <Card>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-52 w-full" />
                ) : !hasActivity ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    No sends in the last 7 days.
                  </p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-52 w-full">
                    <BarChart data={chartData} margin={{ left: -16, right: 4, top: 4 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="sent" stackId="a" fill="var(--color-sent)" radius={[0, 0, 3, 3]} />
                      <Bar dataKey="failed" stackId="a" fill="var(--color-failed)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section
            title="Recent campaigns"
            actions={
              <Link href="/history" className="text-sm font-medium text-info hover:underline">
                View history
              </Link>
            }
          >
            <Card className="gap-0 py-0">
              {loading ? (
                <div className="p-4"><Skeleton className="h-40 w-full" /></div>
              ) : (data?.recentCampaigns.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No campaigns yet.</p>
                  <Link href="/send" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Start your first campaign
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data?.recentCampaigns.map((campaign) => (
                    <li key={campaign.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {numberFormat.format(campaign.sentCount)} sent
                          {campaign.failedCount ? ` · ${campaign.failedCount} failed` : ""}
                          {" · "}
                          {formatRelative(campaign.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={campaign.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Section>
        </div>
      </div>

      <Section
        title="Latest deliveries"
        actions={
          <Button render={<Link href="/history" />} nativeButton={false} variant="ghost" size="sm">
            All activity
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        }
      >
        <Card className="gap-0 py-0">
          {loading ? (
            <div className="p-4"><Skeleton className="h-32 w-full" /></div>
          ) : (data?.recentSends.length ?? 0) === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Deliveries will appear here as soon as you send.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data?.recentSends.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.recipientEmail}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.subject}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">{formatRelative(row.sentAt)}</span>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>
    </Page>
  );
}

function Stat({
  label,
  value,
  href,
  loading,
  tone,
}: {
  label: string;
  value?: number;
  href: string;
  loading: boolean;
  tone?: "danger";
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-border-strong"
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", tone === "danger" && "text-destructive")}>
          {numberFormat.format(value ?? 0)}
        </p>
      )}
    </Link>
  );
}
