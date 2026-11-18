"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, DownloadIcon, OctagonXIcon, RefreshCwIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { Page, PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { useConfirm, useToast } from "@/components/app/providers";
import { StatusBadge } from "@/components/app/status-badge";
import { UrlTabs, useTab } from "@/components/app/url-tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { useUrlState } from "@/hooks/use-url-state";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateTime, numberFormat } from "@/lib/client/format";
import { cn } from "@/lib/utils";

type Detail = {
  campaign: {
    id: string;
    name: string;
    status: string;
    recipientMode: string;
    companyFilter: string | null;
    skipAlreadySent: boolean;
    totalRecipients: number | null;
    processedCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    templateName: string | null;
    templateSubject: string | null;
    stalled: boolean;
  };
  sends: { id: string; recipientEmail: string; subject: string; status: string; errorMessage: string | null; sentAt: string }[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

type Filter = "all" | "sent" | "skipped" | "failed";

const AUDIENCE: Record<string, string> = { all: "All contacts", filter: "By company", pick: "Hand-picked" };

export function CampaignDetail({ id }: { id: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const url = useUrlState();
  const status = useTab<Filter>("all", "status");
  const page = Math.max(Number(url.get("page", "1")) || 1, 1);
  const [acting, setActing] = useState(false);
  const router = useRouter();

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const { data, loading, error, reload } = useMailerFetch<Detail>(
    `/api/v1/campaigns/${id}${params.size ? `?${params}` : ""}`,
  );
  const campaign = data?.campaign;
  const running = campaign?.status === "running";

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [running, reload]);

  async function resume() {
    if (!campaign) return;
    const retryingFailed = campaign.status === "failed";
    const ok = await confirm({
      title: retryingFailed ? "Retry failed recipients?" : "Resume this campaign?",
      description: retryingFailed
        ? "Only recipients that failed will be tried again. Anyone who already received the email is left alone."
        : "Sending continues with the recipients that haven't been processed yet. Nobody who already received it gets a duplicate.",
      confirmLabel: retryingFailed ? "Retry failed" : "Resume",
    });
    if (!ok) return;
    setActing(true);
    try {
      await api(`/api/v1/campaigns/${id}/send`, { method: "POST", body: { resume: true } });
      toast.success(retryingFailed ? "Retrying failed recipients." : "Campaign resumed.");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function cancel() {
    const ok = await confirm({
      title: "Stop this campaign?",
      description:
        "Sending stops after the email currently in progress. Anyone who already got it keeps it, and you can resume later without duplicates.",
      confirmLabel: "Stop sending",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/api/v1/campaigns/${id}/cancel`, { method: "POST" });
      toast.success("Campaign stopped.");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete this campaign?",
      description:
        "The campaign and its per-recipient log are removed. Contacts and templates are untouched, and emails already sent can't be recalled.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/api/v1/campaigns/${id}`, { method: "DELETE" });
      toast.success("Campaign deleted.");
      router.push("/campaigns");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const total = campaign?.totalRecipients ?? 0;
  const pct = total ? Math.round((campaign!.processedCount / total) * 100) : 0;
  const canResume = campaign && (campaign.stalled || campaign.status === "failed" || campaign.status === "cancelled");

  return (
    <Page>
      <Link
        href="/campaigns"
        className="-mb-3 inline-flex min-h-9 w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Campaigns
      </Link>

      {loading ? (
        <>
          <Skeleton className="h-8 w-64" />
          <ListSkeleton rows={3} />
        </>
      ) : error || !campaign || !data ? (
        <ErrorState message={error ?? "Campaign not found."} onRetry={() => void reload()} />
      ) : (
        <>
          <PageHeader
            title={campaign.name}
            description={`${campaign.templateName ?? "Deleted template"} · ${AUDIENCE[campaign.recipientMode] ?? campaign.recipientMode}${campaign.companyFilter ? ` “${campaign.companyFilter}”` : ""} · started ${formatDateTime(campaign.startedAt ?? campaign.createdAt)}`}
            actions={
              <>
                <StatusBadge status={campaign.status} />
                <Button variant="outline" size="sm" onClick={() => void reload()}>
                  <RefreshCwIcon data-icon="inline-start" />
                  Refresh
                </Button>
                {running ? (
                  <Button variant="outline" size="sm" onClick={() => void cancel()}>
                    <OctagonXIcon data-icon="inline-start" />
                    Stop
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => void remove()}>
                    <Trash2Icon data-icon="inline-start" />
                    Delete
                  </Button>
                )}
                {data.total > 0 || campaign.sentCount + campaign.failedCount + campaign.skippedCount > 0 ? (
                  <a
                    href={`/api/v1/campaigns/${id}/export`}
                    download
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Export
                  </a>
                ) : null}
                {canResume ? (
                  <Button size="sm" loading={acting} onClick={() => void resume()}>
                    {acting ? null : <RotateCcwIcon data-icon="inline-start" />}
                    {campaign.status === "failed" ? "Retry failed" : "Resume"}
                  </Button>
                ) : null}
              </>
            }
          />

          {campaign.stalled ? (
            <Alert variant="warning">
              <AlertDescription>
                This campaign hasn&apos;t finished and looks interrupted. Resume it to continue with the
                remaining recipients. Nobody gets a duplicate.
              </AlertDescription>
            </Alert>
          ) : null}

          <section aria-label="Results" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Recipients" value={total} />
            <Metric label="Sent" value={campaign.sentCount} />
            <Metric label="Skipped" value={campaign.skippedCount} />
            <Metric label="Failed" value={campaign.failedCount} danger={campaign.failedCount > 0} />
          </section>

          {running ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>Sending…</span>
                <span>
                  {campaign.processedCount}/{total || "…"}
                </span>
              </div>
              <Progress value={pct} aria-label="Campaign progress" />
            </div>
          ) : null}

          <UrlTabs<Filter>
            param="status"
            label="Filter recipients"
            clear={["page"]}
            options={[
              { value: "all", label: "All" },
              { value: "sent", label: "Sent", count: campaign.sentCount },
              { value: "skipped", label: "Skipped", count: campaign.skippedCount },
              { value: "failed", label: "Failed", count: campaign.failedCount },
            ]}
          />

          {data.sends.length === 0 ? (
            <EmptyState
              icon={RefreshCwIcon}
              title={running ? "Waiting for the first results" : "No recipients here"}
              description={
                running
                  ? "Results appear as each email is processed."
                  : "Nothing matches this filter."
              }
            />
          ) : (
            <>
              <Card className="gap-0 py-0">
                <ul className="divide-y divide-border">
                  {data.sends.map((row) => (
                    <li key={row.id} className="flex flex-col gap-0.5 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium">{row.recipientEmail}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(row.sentAt)}</p>
                      {row.errorMessage ? (
                        <p className={cn("text-xs", row.status === "failed" ? "text-destructive" : "text-muted-foreground")}>
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
                noun="results"
                onPage={(next) => url.set({ page: next === 1 ? null : String(next) })}
              />
            </>
          )}
        </>
      )}
    </Page>
  );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", danger && "text-destructive")}>
        {numberFormat.format(value)}
      </p>
    </div>
  );
}
