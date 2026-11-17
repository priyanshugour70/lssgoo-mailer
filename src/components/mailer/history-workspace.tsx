"use client";

import { useMemo, useState } from "react";
import { HistoryIcon } from "lucide-react";

import { PageHeader } from "@/components/mailer/page-header";
import { EmptyState } from "@/components/mailer/ui/empty-state";
import { ListSkeleton } from "@/components/mailer/ui/list-skeleton";
import { MailerScreen } from "@/components/mailer/ui/screen";
import { SegmentedControl } from "@/components/mailer/ui/segmented-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";

type HistoryRow = {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
};

type HistoryResponse = { history: HistoryRow[] };

export function HistoryWorkspace() {
  const [filter, setFilter] = useState<"all" | "sent" | "skipped" | "failed">("all");
  const { data, loading, reload } = useMailerFetch<HistoryResponse>("/api/v1/history");

  const rows = useMemo(() => {
    const list = data?.history ?? [];
    if (filter === "all") return list;
    return list.filter((row) => row.status === filter);
  }, [data?.history, filter]);

  return (
    <MailerScreen>
      <PageHeader
        title="Send history"
        description="Every personal attempt is logged — including skips when you already sent that template."
        action={
          <button
            type="button"
            className="text-sm font-medium text-brand-blue"
            onClick={() => void reload()}
          >
            Refresh
          </button>
        }
      />

      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "sent", label: "Sent" },
          { value: "skipped", label: "Skipped" },
          { value: "failed", label: "Failed" },
        ]}
      />

      {loading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No sends yet"
          description="When you run a campaign from Send, each result appears here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id} className="border-border/70">
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.recipientEmail}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.subject}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(row.sentAt).toLocaleString()}
                </p>
                {row.errorMessage ? (
                  <p className="text-xs text-destructive">{row.errorMessage}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MailerScreen>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "sent"
      ? "border-brand-green/30 bg-brand-green-muted text-brand-ink"
      : status === "skipped"
        ? "border-brand-blue/30 bg-brand-blue-muted"
        : status === "failed"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border";
  return (
    <Badge variant="secondary" className={`shrink-0 capitalize ${styles}`}>
      {status}
    </Badge>
  );
}