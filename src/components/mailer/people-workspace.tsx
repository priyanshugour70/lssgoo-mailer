"use client";

import { useState } from "react";
import { UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/mailer/page-header";
import { EmptyState } from "@/components/mailer/ui/empty-state";
import { FeedbackBanner } from "@/components/mailer/ui/feedback-banner";
import { ListSkeleton } from "@/components/mailer/ui/list-skeleton";
import { MailerScreen } from "@/components/mailer/ui/screen";
import { SegmentedControl } from "@/components/mailer/ui/segmented-control";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import type { PublicUser } from "@/types/auth/principal";

type PeopleResponse = { people: PublicUser[] };

type IncomingRequest = {
  request: { id: string; message: string | null; status: string };
  requester: { id: string; name: string; email: string; imageUrl: string | null };
};

type MyRequest = {
  request: { id: string; status: string };
  owner: { id: string; name: string; email: string; imageUrl: string | null };
};

type IncomingResponse = { requests: IncomingRequest[] };
type MyRequestsResponse = { requests: MyRequest[] };

export function PeopleWorkspace() {
  const [tab, setTab] = useState<"directory" | "incoming" | "mine">("directory");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const { data: peopleData, loading: peopleLoading, reload: reloadPeople } =
    useMailerFetch<PeopleResponse>("/api/v1/people", { skip: tab !== "directory" });
  const { data: incomingData, loading: incomingLoading, reload: reloadIncoming } =
    useMailerFetch<IncomingResponse>("/api/v1/access-requests?scope=incoming", {
      skip: tab !== "incoming",
    });
  const { data: myData, loading: myLoading, reload: reloadMine } =
    useMailerFetch<MyRequestsResponse>("/api/v1/access-requests", {
      skip: tab !== "mine",
    });

  async function requestAccess(ownerId: string) {
    setFeedback(null);
    const response = await fetch("/api/v1/access-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerId,
        message: "I'd like to see your contact list for coordinated outreach.",
      }),
    });
    setFeedback(
      response.ok
        ? { tone: "success", message: "Request sent — they'll see it under Incoming." }
        : { tone: "error", message: "Could not send request." },
    );
    await reloadMine();
  }

  async function resolveRequest(id: string, decision: "accepted" | "rejected") {
    await fetch(`/api/v1/access-requests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setFeedback({
      tone: "success",
      message: decision === "accepted" ? "Access granted." : "Request declined.",
    });
    await reloadIncoming();
  }

  return (
    <MailerScreen>
      <PageHeader
        title="People"
        description="Everyone on Mailer signs in with Google. Request to view another person's contacts — accept or decline on Incoming."
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "directory", label: "Everyone" },
          { value: "incoming", label: "Incoming" },
          { value: "mine", label: "My requests" },
        ]}
      />

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {tab === "directory" ? (
        peopleLoading ? (
          <ListSkeleton />
        ) : (peopleData?.people.length ?? 0) === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="You're the first one here"
            description="When more teammates sign in, they'll appear in this directory."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {peopleData?.people.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onRequest={() => void requestAccess(person.id)}
              />
            ))}
          </div>
        )
      ) : null}

      {tab === "incoming" ? (
        incomingLoading ? (
          <ListSkeleton rows={2} />
        ) : (incomingData?.requests.length ?? 0) === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No pending requests"
            description="When someone asks to see your contacts, approve them here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {incomingData?.requests.map((row) => (
              <Card key={row.request.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <PersonRow
                    name={row.requester.name}
                    email={row.requester.email}
                    imageUrl={row.requester.imageUrl}
                  />
                  {row.request.message ? (
                    <p className="rounded-lg bg-brand-matte px-3 py-2 text-sm text-muted-foreground">
                      {row.request.message}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="h-11" onClick={() => void resolveRequest(row.request.id, "accepted")}>
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() => void resolveRequest(row.request.id, "rejected")}
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "mine" ? (
        myLoading ? (
          <ListSkeleton rows={2} />
        ) : (myData?.requests.length ?? 0) === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No outgoing requests"
            description="Tap Request on someone's card in Everyone to ask for their list."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {myData?.requests.map((row) => (
              <Card key={row.request.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <PersonRow
                    name={row.owner.name}
                    email={row.owner.email}
                    imageUrl={row.owner.imageUrl}
                  />
                  <StatusBadge status={row.request.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      <Button variant="ghost" className="h-11 w-full" onClick={() => {
        void reloadPeople();
        void reloadIncoming();
        void reloadMine();
      }}>
        Refresh
      </Button>
    </MailerScreen>
  );
}

function PersonCard({
  person,
  onRequest,
}: {
  person: PublicUser;
  onRequest: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <PersonRow
          name={
            [person.firstName, person.lastName].filter(Boolean).join(" ") || person.name
          }
          email={person.email}
          imageUrl={person.imageUrl}
        />
        <Button size="sm" variant="outline" className="shrink-0" onClick={onRequest}>
          Request
        </Button>
      </CardContent>
    </Card>
  );
}

function PersonRow({
  name,
  email,
  imageUrl,
}: {
  name: string;
  email: string;
  imageUrl: string | null;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "accepted"
      ? "border-brand-green/30 bg-brand-green-muted"
      : status === "rejected"
        ? "border-destructive/30"
        : "border-border";
  return (
    <Badge variant="secondary" className={`shrink-0 capitalize ${tone}`}>
      {status}
    </Badge>
  );
}