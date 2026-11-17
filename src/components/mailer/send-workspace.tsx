"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookUserIcon,
  CheckIcon,
  FileTextIcon,
  SendIcon,
  ServerIcon,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { Page, PageHeader } from "@/components/app/page-header";
import { useConfirm, useToast } from "@/components/app/providers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { useSessionDraft } from "@/hooks/use-session-draft";
import { api, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type Contact = {
  id: string;
  email: string;
  company: string | null;
  firstName: string | null;
  lastName: string | null;
};
type Template = {
  id: string;
  name: string;
  subject: string;
  format: string;
  bodyHtml: string | null;
  bodyText: string | null;
  pdfFileId: string | null;
};
type SmtpProfile = { id: string; label: string; host: string; fromEmail: string; isValid: boolean };

type Mode = "all" | "filter" | "pick";
type Draft = {
  step: 1 | 2 | 3;
  mode: Mode;
  companyFilter: string;
  picked: string[];
  templateId: string;
  smtpProfileId: string;
  skipAlreadySent: boolean;
  name: string;
};

const STEPS = ["Recipients", "Message", "Review"] as const;

function defaultName() {
  return `Campaign ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

const initialDraft: Draft = {
  step: 1,
  mode: "all",
  companyFilter: "",
  picked: [],
  templateId: "",
  smtpProfileId: "",
  skipAlreadySent: true,
  name: "",
};

export function SendWorkspace() {
  const contactsQ = useMailerFetch<{ contacts: Contact[] }>("/api/v1/contacts");
  const templatesQ = useMailerFetch<{ templates: Template[] }>("/api/v1/templates");
  const smtpQ = useMailerFetch<{ profiles: SmtpProfile[] }>("/api/v1/smtp-profiles");

  const loading = contactsQ.loading || templatesQ.loading || smtpQ.loading;
  const error = contactsQ.error ?? templatesQ.error ?? smtpQ.error;

  return (
    <Page>
      <PageHeader
        title="New campaign"
        description="Choose who to email, pick a message and sender, then review. Every email is sent individually and personalised."
      />
      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            void contactsQ.reload();
            void templatesQ.reload();
            void smtpQ.reload();
          }}
        />
      ) : (
        <Wizard
          contacts={contactsQ.data?.contacts ?? []}
          templates={templatesQ.data?.templates ?? []}
          profiles={smtpQ.data?.profiles ?? []}
        />
      )}
    </Page>
  );
}

function Wizard({
  contacts,
  templates,
  profiles,
}: {
  contacts: Contact[];
  templates: Template[];
  profiles: SmtpProfile[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft, clearDraft] = useSessionDraft<Draft>("mailer:send-draft", initialDraft);
  const [pickQuery, setPickQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const validProfiles = profiles.filter((p) => p.isValid);
  const patch = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  // Drop stale ids from a restored draft (deleted contacts/templates/profiles).
  const contactIds = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);
  const pickedValid = useMemo(() => draft.picked.filter((id) => contactIds.has(id)), [draft.picked, contactIds]);
  const template = templates.find((t) => t.id === draft.templateId) ?? templates[0];
  const profile = validProfiles.find((p) => p.id === draft.smtpProfileId) ?? validProfiles[0];

  const companies = useMemo(
    () => [...new Set(contacts.map((c) => c.company).filter((c): c is string => Boolean(c)))].sort(),
    [contacts],
  );

  const recipients = useMemo(() => {
    if (draft.mode === "all") return contacts;
    if (draft.mode === "filter") {
      const q = draft.companyFilter.trim().toLowerCase();
      return q ? contacts.filter((c) => (c.company ?? "").toLowerCase().includes(q)) : [];
    }
    const set = new Set(pickedValid);
    return contacts.filter((c) => set.has(c.id));
  }, [contacts, draft.mode, draft.companyFilter, pickedValid]);

  // Warn before leaving mid-wizard with unsaved choices.
  const dirty = draft.step > 1 || draft.picked.length > 0 || draft.companyFilter !== "";
  useEffect(() => {
    if (!dirty || busy) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, busy]);

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={BookUserIcon}
        title="Add contacts first"
        description="A campaign needs at least one recipient. Add people or import a list of emails."
        action={<Link href="/contacts" className={buttonVariants()}>Go to Contacts</Link>}
      />
    );
  }
  if (templates.length === 0 || validProfiles.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {templates.length === 0 ? (
          <EmptyState
            icon={FileTextIcon}
            title="Create a template"
            description="Write the message you want to send. You can personalise it with the recipient's name and company."
            action={<Link href="/setup?tab=templates" className={buttonVariants()}>Create template</Link>}
          />
        ) : null}
        {validProfiles.length === 0 ? (
          <EmptyState
            icon={ServerIcon}
            title="Connect and verify a sender"
            description={
              profiles.length > 0
                ? "You have SMTP profiles, but none has passed verification yet."
                : "Add your SMTP details so Mailer can send on your behalf."
            }
            action={<Link href="/setup" className={buttonVariants()}>Open Setup</Link>}
          />
        ) : null}
      </div>
    );
  }

  const step = draft.step;
  const canContinueFromRecipients = recipients.length > 0;

  async function send() {
    if (busy || !template || !profile) return;
    const ok = await confirm({
      title: `Send to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}?`,
      description: `“${template.name}” will be sent from ${profile.fromEmail}. Emails can't be recalled once sent.`,
      confirmLabel: "Send campaign",
    });
    if (!ok) return;
    setBusy(true);
    setSendError(null);
    try {
      const created = await api<{ campaign: { id: string } }>("/api/v1/campaigns", {
        method: "POST",
        body: {
          name: draft.name.trim() || defaultName(),
          templateId: template.id,
          smtpProfileId: profile.id,
          recipientMode: draft.mode,
          companyFilter: draft.mode === "filter" ? draft.companyFilter.trim() : undefined,
          contactIds: draft.mode === "pick" ? recipients.map((c) => c.id) : undefined,
          skipAlreadySent: draft.skipAlreadySent,
          sendNow: true,
        },
      });
      clearDraft();
      toast.success("Campaign started. Results appear here as emails go out.");
      router.push(`/campaigns/${created.campaign.id}`);
    } catch (err) {
      setSendError(errorMessage(err, "Could not start the campaign."));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <ol aria-label="Progress" className="flex items-center gap-2">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const active = number === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
              <button
                type="button"
                disabled={number > step}
                onClick={() => patch({ step: number as Draft["step"] })}
                className="flex min-h-11 min-w-0 items-center gap-2 text-sm font-medium disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                    done && "bg-success text-white",
                    active && "bg-primary text-primary-foreground",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <CheckIcon aria-hidden className="size-3.5" /> : number}
                </span>
                <span className={cn("truncate", !active && "text-muted-foreground max-sm:sr-only")}>{label}</span>
              </button>
              {index < STEPS.length - 1 ? <span aria-hidden className="h-px flex-1 bg-border" /> : null}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-base font-semibold">Who should receive this?</legend>
              {(
                [
                  { value: "all", title: "All contacts", detail: `${contacts.length} people` },
                  { value: "filter", title: "By company", detail: "Everyone whose company matches" },
                  { value: "pick", title: "Hand-pick", detail: "Choose individual people" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                    draft.mode === option.value ? "border-foreground bg-accent" : "border-border hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="size-4 accent-primary"
                    checked={draft.mode === option.value}
                    onChange={() => patch({ mode: option.value })}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">{option.detail}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {draft.mode === "filter" ? (
              <FormField
                label="Company contains"
                htmlFor="send-company"
                hint={companies.length === 0 ? "None of your contacts has a company yet." : undefined}
              >
                <Input
                  id="send-company"
                  list="send-companies"
                  autoComplete="off"
                  placeholder="e.g. Acme"
                  value={draft.companyFilter}
                  onChange={(event) => patch({ companyFilter: event.target.value })}
                />
                <datalist id="send-companies">
                  {companies.map((company) => (
                    <option key={company} value={company} />
                  ))}
                </datalist>
              </FormField>
            ) : null}

            {draft.mode === "pick" ? (
              <PickList
                contacts={contacts}
                picked={pickedValid}
                query={pickQuery}
                onQuery={setPickQuery}
                onChange={(ids) => patch({ picked: ids })}
              />
            ) : null}

            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2.5" aria-live="polite">
              <span className="text-sm text-muted-foreground">Recipients</span>
              <span className="text-base font-semibold tabular-nums">{recipients.length}</span>
            </div>

            <Button size="lg" disabled={!canContinueFromRecipients} onClick={() => patch({ step: 2 })}>
              Continue
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Message and sender</h2>
            <FormField label="Template" htmlFor="send-template">
              <Select
                id="send-template"
                value={template?.id ?? ""}
                onChange={(event) => patch({ templateId: event.target.value })}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FormField>
            {template ? <TemplatePreview template={template} /> : null}
            <FormField
              label="Send from"
              htmlFor="send-smtp"
              hint="Only verified SMTP profiles can send."
            >
              <Select
                id="send-smtp"
                value={profile?.id ?? ""}
                onChange={(event) => patch({ smtpProfileId: event.target.value })}
              >
                {validProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.fromEmail}
                  </option>
                ))}
              </Select>
            </FormField>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={draft.skipAlreadySent}
                onChange={(event) => patch({ skipAlreadySent: event.target.checked })}
              />
              <span>
                <span className="block font-medium">Skip people who already received this template</span>
                <span className="block text-xs text-muted-foreground">
                  Prevents duplicates. Skipped addresses appear in History.
                </span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => patch({ step: 1 })}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={() =>
                  patch({
                    step: 3,
                    templateId: template?.id ?? "",
                    smtpProfileId: profile?.id ?? "",
                    name: draft.name || defaultName(),
                  })
                }
              >
                Review
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && template && profile ? (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Review and send</h2>
            <FormField label="Campaign name" htmlFor="send-name" hint="Only visible to you.">
              <Input
                id="send-name"
                value={draft.name}
                maxLength={120}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </FormField>
            <dl className="divide-y divide-border rounded-xl border border-border text-sm">
              <SummaryRow label="Recipients" value={`${recipients.length}`} />
              <SummaryRow
                label="Audience"
                value={
                  draft.mode === "all"
                    ? "All contacts"
                    : draft.mode === "filter"
                      ? `Company contains “${draft.companyFilter.trim()}”`
                      : "Hand-picked"
                }
              />
              <SummaryRow label="Template" value={template.name} />
              <SummaryRow label="Subject" value={template.subject} />
              <SummaryRow label="From" value={`${profile.label} · ${profile.fromEmail}`} />
              <SummaryRow label="Attachment" value={template.pdfFileId ? "PDF" : "None"} />
              <SummaryRow label="Skip duplicates" value={draft.skipAlreadySent ? "Yes" : "No"} />
            </dl>
            {sendError ? (
              <Alert variant="destructive">
                <AlertDescription>{sendError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" disabled={busy} onClick={() => patch({ step: 2 })}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Button>
              <Button size="lg" loading={busy} disabled={recipients.length === 0} onClick={() => void send()}>
                {busy ? null : <SendIcon data-icon="inline-start" />}
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function TemplatePreview({ template }: { template: Template }) {
  const body = (template.format === "html" ? template.bodyHtml : template.bodyText) ?? "";
  const plain = template.format === "html" ? body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : body;
  return (
    <div className="rounded-xl bg-muted p-3 text-sm">
      <div className="mb-1 flex items-center gap-2">
        <Badge variant="neutral">{template.format.toUpperCase()}</Badge>
        {template.pdfFileId ? <Badge variant="info">PDF attached</Badge> : null}
      </div>
      <p className="truncate font-medium">{template.subject}</p>
      <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-muted-foreground">{plain}</p>
    </div>
  );
}

function PickList({
  contacts,
  picked,
  query,
  onQuery,
  onChange,
}: {
  contacts: Contact[];
  picked: string[];
  query: string;
  onQuery: (q: string) => void;
  onChange: (ids: string[]) => void;
}) {
  const pickedSet = new Set(picked);
  const q = query.trim().toLowerCase();
  const shown = q
    ? contacts.filter((c) => `${c.email} ${c.firstName ?? ""} ${c.lastName ?? ""} ${c.company ?? ""}`.toLowerCase().includes(q))
    : contacts;
  const allShownPicked = shown.length > 0 && shown.every((c) => pickedSet.has(c.id));

  function toggleAll() {
    const next = new Set(pickedSet);
    for (const c of shown) {
      if (allShownPicked) next.delete(c.id);
      else next.add(c.id);
    }
    onChange([...next]);
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="search"
        aria-label="Search contacts to pick"
        placeholder="Search contacts"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      <div className="flex items-center justify-between text-sm">
        <label className="flex min-h-9 cursor-pointer items-center gap-2">
          <Checkbox checked={allShownPicked} onChange={toggleAll} />
          {q ? "Select all matching" : "Select all"}
        </label>
        <span className="text-muted-foreground tabular-nums">{picked.length} selected</span>
      </div>
      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
        {shown.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">No contacts match.</li>
        ) : (
          shown.map((contact) => (
            <li key={contact.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
                <Checkbox
                  checked={pickedSet.has(contact.id)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...picked, contact.id]
                        : picked.filter((id) => id !== contact.id),
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{contact.email}</span>
                  {contact.company ? (
                    <span className="block truncate text-xs text-muted-foreground">{contact.company}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
