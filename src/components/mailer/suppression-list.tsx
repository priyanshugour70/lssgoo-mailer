"use client";

import { useState } from "react";
import { BanIcon, Trash2Icon } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { useConfirm, useToast } from "@/components/app/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/client/format";

type Row = { id: string; email: string; reason: string; createdAt: string };

const REASON: Record<string, string> = {
  unsubscribed: "Unsubscribed",
  manual: "Blocked by you",
  bounced: "Bounced",
};

export function SuppressionList({ onChange }: { onChange?: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useMailerFetch<{ suppressions: Row[] }>("/api/v1/suppressions");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const result = await api<{ added: number }>("/api/v1/suppressions", { method: "POST", body: { raw } });
      toast.success(`Blocked ${result.added} address${result.added === 1 ? "" : "es"}.`);
      setRaw("");
      await reload();
      onChange?.();
    } catch (err) {
      toast.error(errorMessage(err, "Could not block those addresses."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    const ok = await confirm({
      title: `Allow ${row.email} again?`,
      description: "Future campaigns will email this address again. Only do this if they asked to be re-added.",
      confirmLabel: "Allow again",
    });
    if (!ok) return;
    try {
      await api("/api/v1/suppressions", { method: "DELETE", body: { ids: [row.id] } });
      toast.success("Removed from the suppression list.");
      await reload();
      onChange?.();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Addresses here are skipped by every campaign. People who click the unsubscribe link in your
        emails (use <code className="rounded bg-muted px-1">{"{{unsubscribeUrl}}"}</code> in a template) are added automatically.
      </p>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (raw.trim()) void add();
        }}
      >
        <Textarea
          aria-label="Addresses to block"
          placeholder="Paste emails to block, separated by commas, spaces or new lines"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={2}
        />
        <Button type="submit" loading={busy} disabled={!raw.trim()} className="sm:self-start">
          <BanIcon data-icon="inline-start" />
          Block
        </Button>
      </form>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : !data || data.suppressions.length === 0 ? (
        <EmptyState icon={BanIcon} title="Nobody is blocked" description="Unsubscribes and addresses you block will appear here." />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {data.suppressions.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.email}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(row.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{REASON[row.reason] ?? row.reason}</Badge>
                  <Button size="icon" variant="ghost" aria-label={`Allow ${row.email} again`} onClick={() => void remove(row)}>
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
