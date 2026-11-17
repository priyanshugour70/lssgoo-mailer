"use client";

import { useMemo, useState } from "react";
import { BookUserIcon, MailIcon, SearchIcon } from "lucide-react";

import { PageHeader } from "@/components/mailer/page-header";
import { EmptyState } from "@/components/mailer/ui/empty-state";
import { FeedbackBanner } from "@/components/mailer/ui/feedback-banner";
import { FormField } from "@/components/mailer/ui/form-field";
import { ListSkeleton } from "@/components/mailer/ui/list-skeleton";
import { MailerScreen } from "@/components/mailer/ui/screen";
import { SegmentedControl } from "@/components/mailer/ui/segmented-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
};

type ContactsResponse = { contacts: Contact[] };

type SharedResponse = {
  shared: {
    contact: Contact;
    owner: { name: string; email: string };
  }[];
};

export function ContactsWorkspace() {
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const {
    data: mineData,
    loading: mineLoading,
    reload: reloadMine,
  } = useMailerFetch<ContactsResponse>("/api/v1/contacts", {
    skip: tab !== "mine",
  });
  const {
    data: sharedData,
    loading: sharedLoading,
    reload: reloadShared,
  } = useMailerFetch<SharedResponse>("/api/v1/contacts/shared", {
    skip: tab !== "shared",
  });

  const contacts = mineData?.contacts ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  async function addContact() {
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/v1/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, company }),
    });
    setBusy(false);
    if (!response.ok) {
      setFeedback({ tone: "error", message: "Could not save this contact." });
      return;
    }
    setEmail("");
    setFirstName("");
    setLastName("");
    setCompany("");
    setFeedback({ tone: "success", message: "Contact added to your workspace." });
    await reloadMine();
  }

  async function importBulk() {
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/v1/contacts/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raw: bulk }),
    });
    setBusy(false);
    if (!response.ok) {
      setFeedback({ tone: "error", message: "Bulk import failed." });
      return;
    }
    const data = (await response.json()) as { count: number };
    setBulk("");
    setFeedback({
      tone: "success",
      message: `Imported ${data.count} email${data.count === 1 ? "" : "s"}.`,
    });
    await reloadMine();
  }

  return (
    <MailerScreen>
      <PageHeader
        title="Contacts"
        description="People-oriented company emails. Every user keeps their own list; shared lists appear in the Shared tab."
      />

      <SegmentedControl
        value={tab}
        onChange={(value) => {
          setTab(value);
          setQuery("");
        }}
        options={[
          { value: "mine", label: "My list" },
          { value: "shared", label: "Shared" },
        ]}
      />

      {tab === "mine" ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField label="Email" hint="Required — one row per person.">
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First name">
                  <Input
                    className="h-12"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </FormField>
                <FormField label="Last name">
                  <Input
                    className="h-12"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Company">
                <Input
                  className="h-12"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </FormField>
              <Button
                className="h-12 w-full text-base"
                disabled={busy || !email.trim()}
                onClick={() => void addContact()}
              >
                {busy ? <Spinner className="size-5" /> : "Save contact"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bulk import</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder="Paste many emails — comma, semicolon, or new line"
                className="min-h-36 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-base leading-relaxed"
              />
              <Button
                variant="outline"
                className="h-12 w-full"
                disabled={busy || !bulk.trim()}
                onClick={() => void importBulk()}
              >
                Import all
              </Button>
            </CardContent>
          </Card>

          {feedback ? (
            <FeedbackBanner tone={feedback.tone} message={feedback.message} />
          ) : null}

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
            <Input
              className="h-12 pl-10 text-base"
              placeholder="Search email, name, company"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {mineLoading ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MailIcon}
              title="No contacts yet"
              description="Add one above or paste a bulk list to start building your audience."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {filtered.length} contact{filtered.length === 1 ? "" : "s"}
              </p>
              {filtered.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => void reloadShared()}
          >
            Refresh shared lists
          </Button>
          {sharedLoading ? (
            <ListSkeleton />
          ) : (sharedData?.shared.length ?? 0) === 0 ? (
            <EmptyState
              icon={BookUserIcon}
              title="No shared contacts"
              description="Request access from People — when someone accepts, their emails show here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sharedData?.shared.map((row, index) => (
                <Card key={`${row.contact.id}-${index}`} className="border-border/70">
                  <CardContent className="flex flex-col gap-1 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{row.contact.email}</p>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {row.owner.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.contact.company || "No company"} · via {row.owner.email}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </MailerScreen>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-col gap-1 py-3">
        <p className="text-sm font-semibold">{contact.email}</p>
        {name ? <p className="text-xs text-foreground/80">{name}</p> : null}
        <p className="text-xs text-muted-foreground">
          {contact.company || "Independent / no company set"}
        </p>
      </CardContent>
    </Card>
  );
}