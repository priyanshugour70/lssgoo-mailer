"use client";

import { useCallback } from "react";
import Link from "next/link";
import { HistoryIcon, RefreshCwIcon } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { Page, PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SearchInput } from "@/components/app/search-input";
import { StatusBadge } from "@/components/app/status-badge";
import { UrlTabs, useTab } from "@/components/app/url-tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime } from "@/lib/client/format";
import { cn } from "@/lib/utils";

type HistoryRow = {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
};

type HistoryResponse = {
  history: HistoryRow[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  counts: { all: number; sent: number; skipped: number; failed: number };
};

type Filter = "all" | "sent" | "skipped" | "failed";

export function HistoryWorkspace() {
  const url = useUrlState();
  const status = useTab<Filter>("all", "status");
  const q = url.get("q");
  const page = Math.max(Number(url.get("page", "1")) || 1, 1);

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const { data, loading, refreshing, error, reload } = useMailerFetch<HistoryResponse>(
    `/api/v1/history${params.size ? `?${params}` : ""}`,
  );

  const setQuery = useCallback((value: string) => url.set({ q: value, page: null }), [url]);
  const counts = data?.counts;

  return (
    <Page>
      <PageHeader
        title="Send history"
        description="Every attempt, newest first — including addresses skipped because they already received that template."
        actions={
          <Button variant="outline" onClick={() => void reload()} loading={refreshing}>
            {refreshing ? null : <RefreshCwIcon data-icon="inline-start" />}
            Refresh
          </Button>
        }
      />

      <UrlTabs<Filter>
        param="status"
        label="Filter by status"
        clear={["page"]}
        options={[
          { value: "all", label: "All", count: counts?.all },
          { value: "sent", label: "Sent", count: counts?.sent },
          { value: "skipped", label: "Skipped", count: counts?.skipped },
          { value: "failed", label: "Failed", count: counts?.failed },
        ]}
      />

      <SearchInput
        label="Search history"
        placeholder="Search recipient or subject"
        value={q}
        onCommit={setQuery}
      />

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : !data || data.history.length === 0 ? (
        counts && counts.all === 0 && !q ? (
          <EmptyState
            icon={HistoryIcon}
            title="No emails sent yet"
            description="When you run a campaign, each recipient's result is recorded here."
            action={<Link href="/send" className={buttonVariants()}>Start a campaign</Link>}
          />
        ) : (
          <EmptyState
            icon={HistoryIcon}
            title="No matching results"
            description="Try a different status or search term."
            action={
              <Button variant="outline" onClick={() => url.set({ q: null, status: null, page: null })}>
                Reset filters
              </Button>
            }
          />
        )
      ) : (
        <>
          <Card className={cn("gap-0 py-0 transition-opacity", refreshing && "opacity-70")}>
            <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_7rem_9rem] gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
              <span>Recipient</span>
              <span>Subject</span>
              <span>Status</span>
              <span>When</span>
            </div>
            <ul className="divide-y divide-border">
              {data.history.map((row) => (
                <li
                  key={row.id}
                  className="grid gap-x-3 gap-y-0.5 px-4 py-3 max-md:grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_7rem_9rem] md:items-center"
                >
                  <p className="truncate text-sm font-medium">{row.recipientEmail}</p>
                  <p className="truncate text-sm text-muted-foreground max-md:col-span-2 max-md:row-start-2">
                    {row.subject}
                  </p>
                  <div className="max-md:col-start-2 max-md:row-start-1">
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums max-md:col-span-2 max-md:row-start-3">
                    {formatDateTime(row.sentAt)}
                  </p>
                  {row.errorMessage ? (
                    <p
                      className={cn(
                        "text-xs max-md:col-span-2 md:col-span-4",
                        row.status === "failed" ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {row.errorMessage}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            pageSize={data.pageSize}
            noun="emails"
            onPage={(next) => url.set({ page: next === 1 ? null : String(next) })}
          />
        </>
      )}
    </Page>
  );
}
