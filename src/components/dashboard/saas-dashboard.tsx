"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock3Icon,
  MailIcon,
  SendIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";

import { LiveClockPanel } from "@/components/dashboard/live-clock";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

type DashboardPayload = {
  stats: {
    contacts: number;
    templates: number;
    smtpValidated: number;
    totalSends: number;
  };
  sendsByDay: {
    day: string;
    total: number;
    sent: number;
    failed: number;
  }[];
  activeCampaigns: {
    id: string;
    name: string;
    status: string;
    totalRecipients: number | null;
    processedCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
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
  sent: { label: "Sent", color: "var(--brand-green)" },
  failed: { label: "Failed", color: "var(--destructive)" },
} satisfies ChartConfig;

export function SaasDashboard() {
  const user = useCurrentUser();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/dashboard");
    if (response.ok) {
      setData((await response.json()) as DashboardPayload);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const slow = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(slow);
  }, [load]);

  const hasRunning = (data?.activeCampaigns.length ?? 0) > 0;

  useEffect(() => {
    if (!hasRunning) return;
    const fast = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(fast);
  }, [hasRunning, load]);

  const chartData = useMemo(() => {
    const days = data?.sendsByDay ?? [];
    return days.map((row) => ({
      day: row.day.slice(5),
      sent: Number(row.sent),
      failed: Number(row.failed),
    }));
  }, [data?.sendsByDay]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <WelcomeHero user={user} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Contacts" value={data?.stats.contacts ?? 0} href="/contacts" />
        <KpiCard label="Templates" value={data?.stats.templates ?? 0} href="/setup" />
        <KpiCard label="SMTP ready" value={data?.stats.smtpValidated ?? 0} href="/setup" />
        <KpiCard label="Emails logged" value={data?.stats.totalSends ?? 0} href="/history" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Send activity</CardTitle>
            <CardDescription>Last 7 days — sent vs failed</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading chart…</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No send data yet.</p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-[16/9] max-h-72 w-full">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stackId="a"
                    fill="var(--color-sent)"
                    stroke="var(--color-sent)"
                    fillOpacity={0.35}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stackId="a"
                    fill="var(--color-failed)"
                    stroke="var(--color-failed)"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <LiveClockPanel />
      </div>

      {(data?.activeCampaigns.length ?? 0) > 0 ? (
        <Card className="border-brand-blue/25 bg-brand-blue-muted/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Async campaigns
              <Badge className="border-brand-green/30 bg-brand-green-muted">Running</Badge>
            </CardTitle>
            <CardDescription>
              Sends continue in the background — this panel updates automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data?.activeCampaigns.map((campaign) => {
              const total = campaign.totalRecipients ?? 1;
              const progress = Math.round((campaign.processedCount / total) * 100);
              return (
                <div key={campaign.id} className="flex flex-col gap-2 rounded-xl bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{campaign.name}</p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {campaign.processedCount}/{total}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {campaign.sentCount} sent · {campaign.skippedCount} skipped ·{" "}
                    {campaign.failedCount} failed
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Core modules for your mailer workspace</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/contacts" icon={MailIcon} label="Contacts" />
          <QuickAction href="/people" icon={UsersIcon} label="People" />
          <QuickAction href="/send" icon={SendIcon} label="Send" />
          <QuickAction href="/setup" icon={Settings2Icon} label="Setup" />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Recent delivery log</CardTitle>
          <CardDescription>Latest personal sends from async jobs</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[min(320px,50vh)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="hidden sm:table-cell">Subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentSends ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[140px] truncate font-medium">
                      {row.recipientEmail}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate sm:table-cell">
                      {row.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3Icon className="size-3.5" />
        Dashboard auto-refreshes while campaigns are running.
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="border-border/70 shadow-sm transition active:scale-[0.99]">
        <CardContent className="flex flex-col gap-1 py-4">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof MailIcon;
  label: string;
}) {
  return (
    <Button
      render={<Link href={href} />}
      variant="outline"
      className="h-12 w-full justify-start gap-2"
    >
      <Icon data-icon="inline-start" />
      {label}
    </Button>
  );
}