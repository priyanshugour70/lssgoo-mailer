"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MailsIcon, PlusIcon } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { Page, PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { formatRelative, numberFormat } from "@/lib/client/format";

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  recipientMode: string;
  totalRecipients: number | null;
  processedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  templateName: string | null;
};

export function CampaignsWorkspace() {
  const { data, loading, error, reload } = useMailerFetch<{ campaigns: CampaignRow[] }>(
    "/api/v1/campaigns",
  );
  const campaigns = data?.campaigns ?? [];
  const running = campaigns.some((c) => c.status === "running");

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 3000);
    return () => window.clearInterval(id);
  }, [running, reload]);

  return (
    <Page>
      <PageHeader
        title="Campaigns"
        description="Every send you've started, with live progress and per-recipient results."
        actions={
          <Link href="/send" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            New campaign
          </Link>
        }
      />

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={MailsIcon}
          title="No campaigns yet"
          description="Your campaigns appear here as soon as you send one."
          action={<Link href="/send" className={buttonVariants()}>Start a campaign</Link>}
        />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {campaigns.map((c) => {
              const total = c.totalRecipients ?? 0;
              const pct = total ? Math.round((c.processedCount / total) * 100) : 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">{c.name}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">
                      {c.templateName ?? "Deleted template"} · {numberFormat.format(c.sentCount)} sent
                      {c.failedCount ? ` · ${c.failedCount} failed` : ""}
                      {c.skippedCount ? ` · ${c.skippedCount} skipped` : ""} · {formatRelative(c.createdAt)}
                    </p>
                    {c.status === "running" ? (
                      <Progress value={pct} aria-label={`${c.name} progress`} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </Page>
  );
}
