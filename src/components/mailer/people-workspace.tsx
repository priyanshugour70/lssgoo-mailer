"use client";

import { useCallback, useMemo, useState } from "react";
import { UsersIcon } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { Page, PageHeader } from "@/components/app/page-header";
import { useToast } from "@/components/app/providers";
import { SearchInput } from "@/components/app/search-input";
import { StatusBadge } from "@/components/app/status-badge";
import { UrlTabs, useTab } from "@/components/app/url-tabs";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { useUrlState } from "@/hooks/use-url-state";
import { api, errorMessage } from "@/lib/client/api";
import type { PublicUser } from "@/types/auth/principal";

type Incoming = {
  request: { id: string; message: string | null; status: string };
  requester: { id: string; name: string; email: string; imageUrl: string | null };
};
type Outgoing = {
  request: { id: string; status: string };
  owner: { id: string; name: string; email: string; imageUrl: string | null };
};

function displayName(person: PublicUser) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.name;
}

export function PeopleWorkspace() {
  const toast = useToast();
  const url = useUrlState();
  const tab = useTab<"directory" | "incoming" | "mine">("directory");
  const q = url.get("q");

  const people = useMailerFetch<{ people: PublicUser[] }>("/api/v1/people");
  const incoming = useMailerFetch<{ requests: Incoming[] }>("/api/v1/access-requests?scope=incoming");
  const mine = useMailerFetch<{ requests: Outgoing[] }>("/api/v1/access-requests");

  const [requestTarget, setRequestTarget] = useState<PublicUser | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const setQuery = useCallback((value: string) => url.set({ q: value }), [url]);

  // Latest request per person, so the directory can show state instead of a
  // button that would just fail with "already requested".
  const requestState = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of mine.data?.requests ?? []) {
      const current = map.get(row.owner.id);
      if (current === "accepted") continue;
      if (row.request.status === "pending" || row.request.status === "accepted" || !current) {
        map.set(row.owner.id, row.request.status);
      }
    }
    return map;
  }, [mine.data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = people.data?.people ?? [];
    return term ? list.filter((p) => `${displayName(p)} ${p.email}`.toLowerCase().includes(term)) : list;
  }, [people.data, q]);

  async function resolve(id: string, decision: "accepted" | "rejected") {
    setResolving(id);
    try {
      await api(`/api/v1/access-requests/${id}`, { method: "PATCH", body: { decision } });
      toast.success(decision === "accepted" ? "Access granted." : "Request declined.");
      await incoming.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setResolving(null);
    }
  }

  return (
    <Page>
      <PageHeader
        title="People"
        description="Everyone who signs in with Google appears here. Ask to see someone's contacts, or approve requests to yours."
      />

      <UrlTabs
        label="People sections"
        clear={["q"]}
        options={[
          { value: "directory", label: "Directory", count: people.data?.people.length },
          { value: "incoming", label: "Requests to you", count: incoming.data?.requests.length },
          { value: "mine", label: "Your requests", count: mine.data?.requests.length },
        ]}
      />

      {tab === "directory" ? (
        <>
          <SearchInput label="Search people" placeholder="Search name or email" value={q} onCommit={setQuery} />
          {people.loading ? (
            <ListSkeleton />
          ) : people.error ? (
            <ErrorState message={people.error} onRetry={() => void people.reload()} />
          ) : (people.data?.people.length ?? 0) === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="You're the only one here"
              description="Teammates will show up once they sign in with Google."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No matches"
              description={`Nobody matches “${q}”.`}
              action={<Button variant="outline" onClick={() => setQuery("")}>Clear search</Button>}
            />
          ) : (
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">
                {filtered.map((person) => {
                  const state = requestState.get(person.id);
                  return (
                    <li key={person.id} className="flex items-center gap-3 px-4 py-3">
                      <Person name={displayName(person)} email={person.email} imageUrl={person.imageUrl} />
                      {state === "accepted" ? (
                        <StatusBadge status="accepted" />
                      ) : state === "pending" ? (
                        <StatusBadge status="pending" />
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRequestTarget(person)}>
                          Request access
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      ) : null}

      {tab === "incoming" ? (
        incoming.loading ? (
          <ListSkeleton rows={2} />
        ) : incoming.error ? (
          <ErrorState message={incoming.error} onRetry={() => void incoming.reload()} />
        ) : (incoming.data?.requests.length ?? 0) === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No pending requests"
            description="When someone asks to see your contacts, you'll approve or decline them here."
          />
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y divide-border">
              {incoming.data?.requests.map((row) => (
                <li key={row.request.id} className="flex flex-col gap-3 px-4 py-4">
                  <Person name={row.requester.name} email={row.requester.email} imageUrl={row.requester.imageUrl} />
                  {row.request.message ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{row.request.message}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 sm:flex-none"
                      loading={resolving === row.request.id}
                      onClick={() => void resolve(row.request.id, "accepted")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      disabled={resolving === row.request.id}
                      onClick={() => void resolve(row.request.id, "rejected")}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      ) : null}

      {tab === "mine" ? (
        mine.loading ? (
          <ListSkeleton rows={2} />
        ) : mine.error ? (
          <ErrorState message={mine.error} onRetry={() => void mine.reload()} />
        ) : (mine.data?.requests.length ?? 0) === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="You haven't asked anyone yet"
            description="Open the Directory and choose “Request access” on a person to see their contacts."
          />
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y divide-border">
              {mine.data?.requests.map((row) => (
                <li key={row.request.id} className="flex items-center gap-3 px-4 py-3">
                  <Person name={row.owner.name} email={row.owner.email} imageUrl={row.owner.imageUrl} />
                  <StatusBadge status={row.request.status} />
                </li>
              ))}
            </ul>
          </Card>
        )
      ) : null}

      <Dialog open={requestTarget !== null} onOpenChange={(open) => !open && setRequestTarget(null)}>
        <DialogContent>
          {requestTarget ? (
            <RequestForm
              key={requestTarget.id}
              person={requestTarget}
              onCancel={() => setRequestTarget(null)}
              onSent={async () => {
                setRequestTarget(null);
                await mine.reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Page>
  );
}

function RequestForm({
  person,
  onCancel,
  onSent,
}: {
  person: PublicUser;
  onCancel: () => void;
  onSent: () => Promise<void>;
}) {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/access-requests", {
        method: "POST",
        body: { ownerId: person.id, message: message.trim() || undefined },
      });
      toast.success(`Request sent to ${displayName(person)}.`);
      await onSent();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Request access</DialogTitle>
        <DialogDescription>
          {displayName(person)} will be asked to share their contact list with you. It stays read-only.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Message" htmlFor="request-message" optional error={error}>
        <Textarea
          id="request-message"
          autoFocus
          className="min-h-24"
          maxLength={500}
          placeholder="Why do you need access?"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy}>Send request</Button>
      </DialogFooter>
    </form>
  );
}

function Person({ name, email, imageUrl }: { name: string; email: string; imageUrl: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <UserAvatar name={name} imageUrl={imageUrl} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}
