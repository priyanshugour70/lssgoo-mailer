"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookUserIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { Page, PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { useConfirm, useToast } from "@/components/app/providers";
import { SearchInput } from "@/components/app/search-input";
import { UrlTabs, useTab } from "@/components/app/url-tabs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SuppressionList } from "@/components/mailer/suppression-list";
import { MAX_IMPORT, parseContacts } from "@/lib/contacts/parse";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { useUrlState } from "@/hooks/use-url-state";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  notes: string | null;
};

type SharedRow = { contact: Contact; owner: { name: string; email: string } };

const PAGE_SIZE = 25;
type SortKey = "newest" | "email" | "name" | "company";
const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  email: "Email A–Z",
  name: "Name A–Z",
  company: "Company A–Z",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fullName(contact: Contact) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

function matches(contact: Contact, q: string) {
  if (!q) return true;
  const haystack = `${contact.email} ${fullName(contact)} ${contact.company ?? ""}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export function ContactsWorkspace() {
  const url = useUrlState();
  const tab = useTab<"mine" | "shared" | "blocked">("mine");
  const query = url.get("q");
  const page = Math.max(Number(url.get("page", "1")) || 1, 1);
  const sort = url.get("sort", "newest") as SortKey;

  const mine = useMailerFetch<{ contacts: Contact[] }>("/api/v1/contacts");
  const shared = useMailerFetch<{ shared: SharedRow[] }>("/api/v1/contacts/shared");

  const setQuery = useCallback((q: string) => url.set({ q, page: null }), [url]);

  return (
    <Page>
      <PageHeader
        title="Contacts"
        description="Your audience. Each person keeps their own list; lists shared with you are read-only."
      />

      <UrlTabs
        label="Contact lists"
        clear={["q", "page"]}
        options={[
          { value: "mine", label: "My contacts", count: mine.data?.contacts.length },
          { value: "shared", label: "Shared with me", count: shared.data?.shared.length },
          { value: "blocked", label: "Blocked" },
        ]}
      />

      {tab === "mine" ? (
        <MyContacts
          contacts={mine.data?.contacts ?? []}
          loading={mine.loading}
          error={mine.error}
          reload={mine.reload}
          query={query}
          page={page}
          sort={sort}
          onSort={(value) => url.set({ sort: value === "newest" ? null : value, page: null })}
          onQuery={setQuery}
          onPage={(next) => url.set({ page: next === 1 ? null : String(next) })}
        />
      ) : tab === "blocked" ? (
        <SuppressionList />
      ) : (
        <SharedContacts
          rows={shared.data?.shared ?? []}
          loading={shared.loading}
          error={shared.error}
          reload={shared.reload}
          query={query}
          page={page}
          onQuery={setQuery}
          onPage={(next) => url.set({ page: next === 1 ? null : String(next) })}
        />
      )}
    </Page>
  );
}

/* ───────────── My contacts ───────────── */

function MyContacts({
  contacts,
  loading,
  error,
  reload,
  query,
  page,
  sort,
  onSort,
  onQuery,
  onPage,
}: {
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  query: string;
  page: number;
  onQuery: (q: string) => void;
  onPage: (page: number) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCompany, setBulkCompany] = useState("");

  const filtered = useMemo(() => {
    const list = contacts.filter((c) => matches(c, query));
    if (sort === "newest") return list;
    const key = (c: Contact) =>
      (sort === "email" ? c.email : sort === "company" ? c.company ?? "\uffff" : fullName(c) || "\uffff").toLowerCase();
    return [...list].sort((a, b) => key(a).localeCompare(key(b)));
  }, [contacts, query, sort]);
  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(ids: string[], label: string) {
    const ok = await confirm({
      title: `Delete ${label}?`,
      description:
        "This removes them from your list. Past send history is kept. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      const result = await api<{ removed: number }>("/api/v1/contacts/bulk", {
        method: "DELETE",
        body: { ids },
      });
      setSelected(new Set());
      toast.success(`Deleted ${result.removed} contact${result.removed === 1 ? "" : "s"}.`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete."));
    }
  }

  async function applyCompany() {
    try {
      const result = await api<{ updated: number }>("/api/v1/contacts/bulk", {
        method: "PATCH",
        body: { ids: [...selected], company: bulkCompany.trim() || null },
      });
      toast.success(
        bulkCompany.trim()
          ? `Set company on ${result.updated} contact${result.updated === 1 ? "" : "s"}.`
          : `Cleared company on ${result.updated} contact${result.updated === 1 ? "" : "s"}.`,
      );
      setBulkCompany("");
      setSelected(new Set());
      await reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update."));
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput
            label="Search contacts"
            placeholder="Search email, name or company"
            value={query}
            onCommit={onQuery}
          />
        </div>
        <Select
          aria-label="Sort contacts"
          value={sort}
          onChange={(event) => onSort(event.target.value as SortKey)}
          className="sm:w-40"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setImporting(true)}>
            <UploadIcon data-icon="inline-start" />
            Import
          </Button>
          {contacts.length > 0 ? (
            <a
              href="/api/v1/contacts/export"
              download
              aria-label="Export contacts as CSV"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none")}
            >
              <DownloadIcon data-icon="inline-start" />
              Export
            </a>
          ) : null}
          <Button className="flex-1 sm:flex-none" onClick={() => setEditing("new")}>
            <PlusIcon data-icon="inline-start" />
            Add contact
          </Button>
        </div>
      </div>

      {selected.size > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary px-3 py-2 text-primary-foreground"
        >
          <p className="text-sm font-medium tabular-nums">{selected.size} selected</p>
          <form
            className="flex min-w-0 flex-1 gap-1 sm:max-w-xs"
            onSubmit={(event) => {
              event.preventDefault();
              void applyCompany();
            }}
          >
            <Input
              aria-label="Company for selected contacts"
              placeholder="Set company…"
              value={bulkCompany}
              onChange={(event) => setBulkCompany(event.target.value)}
              className="h-8 bg-background text-foreground"
            />
            <Button type="submit" size="sm" variant="secondary">
              Apply
            </Button>
          </form>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void remove([...selected], `${selected.size} contacts`)}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={BookUserIcon}
          title="No contacts yet"
          description="Add people one at a time, or paste a list of emails to import them all at once."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImporting(true)}>
                Import emails
              </Button>
              <Button onClick={() => setEditing("new")}>Add contact</Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookUserIcon}
          title="No matches"
          description={`Nothing matches “${query}”. Try a different name, email or company.`}
          action={
            <Button variant="outline" onClick={() => onQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <>
          <Card className="gap-0 py-0">
            <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
              <Checkbox
                aria-label="Select all on this page"
                checked={allVisibleSelected}
                onChange={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    for (const c of visible) {
                      if (allVisibleSelected) next.delete(c.id);
                      else next.add(c.id);
                    }
                    return next;
                  })
                }
              />
              <span className="flex-1">Contact</span>
              <span className="hidden w-48 md:block">Company</span>
              <span className="w-9" />
            </div>
            <ul className="divide-y divide-border">
              {visible.map((contact) => (
                <li
                  key={contact.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 transition-colors",
                    selected.has(contact.id) && "bg-accent",
                  )}
                >
                  <Checkbox
                    aria-label={`Select ${contact.email}`}
                    checked={selected.has(contact.id)}
                    onChange={() => toggle(contact.id)}
                  />
                  <button
                    type="button"
                    onClick={() => setEditing(contact)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium">{contact.email}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[fullName(contact), contact.company].filter(Boolean).join(" · ") ||
                        "No name or company"}
                    </span>
                  </button>
                  <span className="hidden w-48 truncate text-sm text-muted-foreground md:block">
                    {contact.company ?? "—"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions for ${contact.email}`}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      <DropdownMenuItem onClick={() => setEditing(contact)}>
                        <PencilIcon data-icon="inline-start" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => void remove([contact.id], contact.email)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </Card>
          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={onPage}
            noun="contacts"
          />
          <p className="text-sm text-muted-foreground">
            Ready to reach them?{" "}
            <Link href="/send" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}>
              <SendIcon data-icon="inline-start" /> Start a campaign
            </Link>
          </p>
        </>
      )}

      <ContactDialog
        contact={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await reload();
        }}
      />
      <ImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onImported={async () => {
          setImporting(false);
          await reload();
        }}
      />
    </>
  );
}

/* ───────────── Add / edit dialog ───────────── */

type FormErrors = Partial<Record<"email", string>>;

function ContactDialog({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact | "new" | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const open = contact !== null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {/* Keyed so form state resets for every contact / reopen. */}
        {contact !== null ? (
          <ContactForm
            key={contact === "new" ? "new" : contact.id}
            contact={contact === "new" ? null : contact}
            onSaved={onSaved}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: Contact | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState({
    email: contact?.email ?? "",
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    company: contact?.company ?? "",
    notes: contact?.notes ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const email = values.email.trim();
    if (!EMAIL_RE.test(email)) {
      setErrors({ email: "Enter a valid email address, like name@company.com." });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (contact) {
        await api(`/api/v1/contacts/${contact.id}`, {
          method: "PATCH",
          body: { ...values, email },
        });
        toast.success("Contact updated.");
      } else {
        await api("/api/v1/contacts", { method: "POST", body: { ...values, email } });
        toast.success("Contact saved.");
      }
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: err.message });
      } else {
        toast.error(errorMessage(err, "Could not save this contact."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
        <DialogDescription>
          {contact
            ? "Changes apply to future campaigns."
            : "Adding an email that already exists updates that person."}
        </DialogDescription>
      </DialogHeader>
      <FormField label="Email" htmlFor="contact-email" error={errors.email}>
        <Input
          id="contact-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoFocus
          value={values.email}
          onChange={set("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" htmlFor="contact-first" optional>
          <Input id="contact-first" autoComplete="off" value={values.firstName} onChange={set("firstName")} />
        </FormField>
        <FormField label="Last name" htmlFor="contact-last" optional>
          <Input id="contact-last" autoComplete="off" value={values.lastName} onChange={set("lastName")} />
        </FormField>
      </div>
      <FormField label="Company" htmlFor="contact-company" optional hint="Used to target campaigns by company.">
        <Input id="contact-company" autoComplete="off" value={values.company} onChange={set("company")} />
      </FormField>
      <FormField label="Notes" htmlFor="contact-notes" optional>
        <Textarea id="contact-notes" className="min-h-20" value={values.notes} onChange={set("notes")} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {contact ? "Save changes" : "Save contact"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ───────────── Import dialog ───────────── */

function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {open ? <ImportForm onImported={onImported} onCancel={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({
  onImported,
  onCancel,
}: {
  onImported: () => Promise<void>;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [raw, setRaw] = useState("");
  const [guessNames, setGuessNames] = useState(true);
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(
    () => (raw.trim() ? parseContacts(raw, { guessNames, company }) : null),
    [raw, guessNames, company],
  );
  const valid = result?.contacts.length ?? 0;

  async function loadFile(file: File) {
    if (file.size > 2_000_000) {
      setError("That file is larger than 2 MB. Split it into smaller files.");
      return;
    }
    setError(null);
    setRaw(await file.text());
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || valid === 0) return;
    if (valid > MAX_IMPORT) {
      setError(`Import up to ${MAX_IMPORT} contacts at a time.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const summary = await api<{
        created: number;
        existing: number;
        updated: number;
        invalid: string[];
      }>("/api/v1/contacts/bulk", {
        method: "POST",
        body: { raw, guessNames, company: company.trim() || undefined },
      });
      const parts = [`${summary.created} added`];
      if (summary.existing) parts.push(`${summary.existing} already in your list`);
      if (summary.invalid.length) parts.push(`${summary.invalid.length} skipped as invalid`);
      toast.success(`Import complete: ${parts.join(" · ")}.`);
      await onImported();
    } catch (err) {
      setError(errorMessage(err, "Import failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Import contacts</DialogTitle>
        <DialogDescription>
          Paste anything: separated by commas, spaces, semicolons or new lines. Formats like{" "}
          <span className="font-mono text-xs">Jane Doe &lt;jane@acme.com&gt;</span> or a CSV with a
          header row work too.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Emails or CSV" htmlFor="import-raw" error={error}>
        <Textarea
          id="import-raw"
          autoFocus
          className="min-h-36"
          placeholder={"john.doe@acme.com, jane.smith@globex.com\nbob@initech.com ada@example.org"}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
        />
      </FormField>

      <FormField label="Or upload a file" htmlFor="import-file" optional hint=".csv, .tsv or .txt up to 2 MB">
        <Input
          id="import-file"
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadFile(file);
          }}
        />
      </FormField>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
        <Checkbox className="mt-0.5" checked={guessNames} onChange={(e) => setGuessNames(e.target.checked)} />
        <span>
          <span className="block font-medium">Guess names from addresses</span>
          <span className="block text-xs text-muted-foreground">
            john.doe@acme.com becomes John Doe. Team mailboxes like info@ are left blank, and
            names you already saved are never overwritten.
          </span>
        </span>
      </label>

      <FormField label="Company for all" htmlFor="import-company" optional hint="Applied to rows that don't have one.">
        <Input id="import-company" autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </FormField>

      {result ? (
        <div className="flex flex-col gap-2 rounded-xl bg-muted p-3 text-sm" aria-live="polite">
          <p className="flex flex-wrap gap-2">
            <Badge variant="success">{valid} to import</Badge>
            {result.duplicates > 0 ? <Badge variant="neutral">{result.duplicates} duplicates merged</Badge> : null}
            {result.invalid.length > 0 ? <Badge variant="warning">{result.invalid.length} invalid</Badge> : null}
            {result.mode === "csv" ? <Badge variant="info">CSV detected</Badge> : null}
          </p>
          {valid > 0 ? (
            <ul className="divide-y divide-border">
              {result.contacts.slice(0, 5).map((c) => (
                <li key={c.email} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate font-medium">{c.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                    {c.nameGuessed ? " · guessed" : ""}
                  </span>
                </li>
              ))}
              {valid > 5 ? (
                <li className="pt-1.5 text-xs text-muted-foreground">and {valid - 5} more…</li>
              ) : null}
            </ul>
          ) : null}
          {result.invalid.length > 0 ? (
            <p className="text-xs text-warning">
              Skipped: {result.invalid.slice(0, 4).join(", ")}
              {result.invalid.length > 4 ? ` +${result.invalid.length - 4} more` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} disabled={valid === 0}>
          {valid > 0 ? `Import ${valid}` : "Import"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ───────────── Shared with me ───────────── */

function SharedContacts({
  rows,
  loading,
  error,
  reload,
  query,
  page,
  onQuery,
  onPage,
}: {
  rows: SharedRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  query: string;
  page: number;
  onQuery: (q: string) => void;
  onPage: (page: number) => void;
}) {
  const filtered = useMemo(
    () => rows.filter((row) => matches(row.contact, query) || row.owner.name.toLowerCase().includes(query.toLowerCase())),
    [rows, query],
  );
  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <SearchInput
        label="Search shared contacts"
        placeholder="Search email, name, company or owner"
        value={query}
        onCommit={onQuery}
      />
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Nothing shared with you yet"
          description="Ask a teammate for access from People. Once they approve, their contacts appear here."
          action={
            <Link href="/people" className={buttonVariants({ variant: "outline" })}>
              Go to People
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookUserIcon}
          title="No matches"
          description={`Nothing matches “${query}”.`}
          action={<Button variant="outline" onClick={() => onQuery("")}>Clear search</Button>}
        />
      ) : (
        <>
          <Card className="gap-0 py-0">
            <ul className="divide-y divide-border">
              {visible.map((row) => (
                <li key={`${row.owner.email}-${row.contact.id}`} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.contact.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[fullName(row.contact), row.contact.company].filter(Boolean).join(" · ") ||
                        "No name or company"}
                    </p>
                  </div>
                  <Badge variant="neutral" className="max-w-32 shrink-0 truncate" title={row.owner.email}>
                    {row.owner.name}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={onPage}
            noun="contacts"
          />
        </>
      )}
    </>
  );
}
