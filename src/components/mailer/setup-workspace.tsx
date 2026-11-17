"use client";

import { useRef, useState } from "react";
import {
  FileTextIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  PlusIcon,
  ServerIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { Page, PageHeader } from "@/components/app/page-header";
import { useConfirm, useToast } from "@/components/app/providers";
import { StatusBadge } from "@/components/app/status-badge";
import { UrlTabs, useTab } from "@/components/app/url-tabs";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";
import { api, errorMessage } from "@/lib/client/api";
import { formatRelative } from "@/lib/client/format";

type SmtpProfile = {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string | null;
  isValid: boolean;
  validationError: string | null;
  lastValidatedAt: string | null;
};

type Template = {
  id: string;
  name: string;
  format: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  pdfFileId: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDERS = ["firstName", "lastName", "company", "email", "senderName", "senderEmail"];

export function SetupWorkspace() {
  const tab = useTab<"smtp" | "templates">("smtp");
  const smtp = useMailerFetch<{ profiles: SmtpProfile[] }>("/api/v1/smtp-profiles");
  const templates = useMailerFetch<{ templates: Template[] }>("/api/v1/templates");

  return (
    <Page>
      <PageHeader
        title="Setup"
        description="Connect the mailbox you send from, and write the messages you send."
      />
      <UrlTabs
        label="Setup sections"
        options={[
          { value: "smtp", label: "Senders (SMTP)", count: smtp.data?.profiles.length },
          { value: "templates", label: "Templates", count: templates.data?.templates.length },
        ]}
      />
      {tab === "smtp" ? (
        <SmtpSection
          profiles={smtp.data?.profiles ?? []}
          loading={smtp.loading}
          error={smtp.error}
          reload={smtp.reload}
        />
      ) : (
        <TemplatesSection
          templates={templates.data?.templates ?? []}
          loading={templates.loading}
          error={templates.error}
          reload={templates.reload}
        />
      )}
    </Page>
  );
}

/* ───────────── SMTP ───────────── */

function SmtpSection({
  profiles,
  loading,
  error,
  reload,
}: {
  profiles: SmtpProfile[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  async function verify(profile: SmtpProfile) {
    setVerifying(profile.id);
    try {
      const data = await api<{ result: { ok: boolean; validationError?: string | null } }>(
        `/api/v1/smtp-profiles/${profile.id}/validate`,
        { method: "POST", body: {} },
      );
      if (data.result.ok) toast.success(`${profile.label} is verified and ready to send.`);
      else toast.error(data.result.validationError ?? "Verification failed.");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVerifying(null);
    }
  }

  async function remove(profile: SmtpProfile) {
    const ok = await confirm({
      title: `Delete “${profile.label}”?`,
      description: "You won't be able to send from this mailbox until you add it again.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/api/v1/smtp-profiles/${profile.id}`, { method: "DELETE" });
      toast.success("Sender deleted.");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          Add sender
        </Button>
      </div>

      {loading ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={ServerIcon}
          title="No sender connected"
          description="Add the SMTP details of the mailbox you want to send from. You'll verify it before sending."
          action={<Button onClick={() => setAdding(true)}>Add sender</Button>}
        />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {profiles.map((profile) => (
              <li key={profile.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{profile.label}</p>
                    <StatusBadge status={profile.isValid ? "validated" : "not validated"} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.fromName ? `${profile.fromName} · ` : ""}
                    {profile.fromEmail} · {profile.host}:{profile.port}
                  </p>
                  {profile.validationError ? (
                    <p className="mt-1 text-xs text-destructive">{profile.validationError}</p>
                  ) : profile.lastValidatedAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Verified {formatRelative(profile.lastValidatedAt)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={profile.isValid ? "outline" : "default"}
                    className="flex-1 sm:flex-none"
                    loading={verifying === profile.id}
                    onClick={() => void verify(profile)}
                  >
                    {verifying === profile.id ? null : <ShieldCheckIcon data-icon="inline-start" />}
                    {profile.isValid ? "Re-verify" : "Verify"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions for ${profile.label}`}
                      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted max-md:size-11"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      <DropdownMenuItem variant="destructive" onClick={() => void remove(profile)}>
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          {adding ? (
            <SmtpForm
              onCancel={() => setAdding(false)}
              onSaved={async () => {
                setAdding(false);
                await reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SmtpForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [v, setV] = useState({
    label: "",
    host: "",
    port: "587",
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof v) => (event: { target: { value: string } }) =>
    setV((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    const port = Number(v.port);
    if (!v.host.trim()) next.host = "Enter the SMTP host, e.g. smtp.gmail.com.";
    if (!Number.isInteger(port) || port < 1 || port > 65535) next.port = "Enter a port between 1 and 65535.";
    if (!v.username.trim()) next.username = "Enter the SMTP username.";
    if (!v.password) next.password = "Enter the SMTP password or app password.";
    if (!EMAIL_RE.test(v.fromEmail.trim())) next.fromEmail = "Enter a valid sender email address.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await api("/api/v1/smtp-profiles", {
        method: "POST",
        body: {
          label: v.label.trim() || undefined,
          host: v.host.trim(),
          port,
          secure: port === 465,
          username: v.username.trim(),
          password: v.password,
          fromEmail: v.fromEmail.trim(),
          fromName: v.fromName.trim() || undefined,
        },
      });
      toast.success("Sender saved. Verify it to start sending.");
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save sender."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Add sender</DialogTitle>
        <DialogDescription>
          Your password is encrypted before it is stored and is never shown again.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Name" htmlFor="smtp-label" optional hint="Helps you tell senders apart.">
        <Input id="smtp-label" placeholder="Work Gmail" value={v.label} onChange={set("label")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <FormField label="Host" htmlFor="smtp-host" error={errors.host}>
          <Input id="smtp-host" autoComplete="off" autoCapitalize="none" placeholder="smtp.gmail.com" value={v.host} onChange={set("host")} aria-invalid={Boolean(errors.host)} />
        </FormField>
        <FormField label="Port" htmlFor="smtp-port" error={errors.port} hint={Number(v.port) === 465 ? "SSL" : "STARTTLS"}>
          <Input id="smtp-port" inputMode="numeric" value={v.port} onChange={set("port")} aria-invalid={Boolean(errors.port)} />
        </FormField>
      </div>
      <FormField label="Username" htmlFor="smtp-user" error={errors.username}>
        <Input id="smtp-user" autoComplete="off" autoCapitalize="none" value={v.username} onChange={set("username")} aria-invalid={Boolean(errors.username)} />
      </FormField>
      <FormField label="Password" htmlFor="smtp-pass" error={errors.password} hint="Use an app password if your provider requires one.">
        <Input id="smtp-pass" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} aria-invalid={Boolean(errors.password)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="From email" htmlFor="smtp-from" error={errors.fromEmail}>
          <Input id="smtp-from" type="email" inputMode="email" autoComplete="off" value={v.fromEmail} onChange={set("fromEmail")} aria-invalid={Boolean(errors.fromEmail)} />
        </FormField>
        <FormField label="From name" htmlFor="smtp-from-name" optional>
          <Input id="smtp-from-name" autoComplete="off" value={v.fromName} onChange={set("fromName")} />
        </FormField>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy}>Save sender</Button>
      </DialogFooter>
    </form>
  );
}

/* ───────────── Templates ───────────── */

function TemplatesSection({
  templates,
  loading,
  error,
  reload,
}: {
  templates: Template[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);

  async function remove(template: Template) {
    const ok = await confirm({
      title: `Delete “${template.name}”?`,
      description: "Templates used by past campaigns can't be deleted.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/api/v1/templates/${template.id}`, { method: "DELETE" });
      toast.success("Template deleted.");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          New template
        </Button>
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="No templates yet"
          description="A template is the message you send. Personalise it with the recipient's name or company."
          action={<Button onClick={() => setCreating(true)}>Create template</Button>}
        />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {templates.map((template) => {
              const body = (template.format === "html" ? template.bodyHtml : template.bodyText) ?? "";
              const plain = template.format === "html" ? body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : body;
              return (
                <li key={template.id} className="flex items-start gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{template.name}</p>
                      <Badge variant="neutral">{template.format.toUpperCase()}</Badge>
                      {template.pdfFileId ? (
                        <Badge variant="info">
                          <PaperclipIcon data-icon="inline-start" />
                          PDF
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{template.subject}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{plain}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions for ${template.name}`}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted max-md:size-11"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      <DropdownMenuItem variant="destructive" onClick={() => void remove(template)}>
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-xl">
          {creating ? (
            <TemplateForm
              onCancel={() => setCreating(false)}
              onSaved={async () => {
                setCreating(false);
                await reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TemplateForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [format, setFormat] = useState<"text" | "html">("text");
  const [body, setBody] = useState("Hi {{firstName}},\n\n\n\nBest,\n{{senderName}}");
  const [pdf, setPdf] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function insert(token: string) {
    const el = bodyRef.current;
    const text = `{{${token}}}`;
    if (!el) return setBody((b) => b + text);
    const { selectionStart: start, selectionEnd: end } = el;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/v1/files", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as { file?: { id: string }; error?: string } | null;
      if (!response.ok || !data?.file) throw new Error(data?.error ?? "Upload failed.");
      setPdf({ id: data.file.id, name: file.name });
    } catch (err) {
      toast.error(errorMessage(err, "PDF upload failed."));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || uploading) return;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Give the template a name.";
    if (!subject.trim()) next.subject = "Enter a subject line.";
    if (!body.trim()) next.body = "The message can't be empty.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await api("/api/v1/templates", {
        method: "POST",
        body: {
          name: name.trim(),
          format,
          subject,
          bodyText: format === "text" ? body : undefined,
          bodyHtml: format === "html" ? body : undefined,
          pdfFileId: pdf?.id ?? null,
        },
      });
      toast.success("Template saved.");
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save template."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>New template</DialogTitle>
        <DialogDescription>Insert placeholders to personalise each email.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <FormField label="Name" htmlFor="tpl-name" error={errors.name}>
          <Input id="tpl-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} />
        </FormField>
        <FormField label="Format" htmlFor="tpl-format">
          <Select id="tpl-format" value={format} onChange={(e) => setFormat(e.target.value as "text" | "html")}>
            <option value="text">Plain text</option>
            <option value="html">HTML</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Subject" htmlFor="tpl-subject" error={errors.subject}>
        <Input id="tpl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-invalid={Boolean(errors.subject)} />
      </FormField>
      <FormField label="Message" htmlFor="tpl-body" error={errors.body}>
        <Textarea
          id="tpl-body"
          ref={bodyRef}
          className="min-h-44 font-mono text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={Boolean(errors.body)}
        />
      </FormField>
      <div className="flex flex-wrap gap-1.5" aria-label="Insert placeholder">
        {PLACEHOLDERS.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => insert(token)}
            className="min-h-8 rounded-md border border-border bg-muted px-2 font-mono text-xs transition-colors hover:border-border-strong max-md:min-h-9"
          >
            {`{{${token}}}`}
          </button>
        ))}
      </div>
      <FormField label="PDF attachment" htmlFor="tpl-pdf" optional hint="Sent with every email using this template.">
        {pdf ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <PaperclipIcon aria-hidden className="size-4 shrink-0" />
              <span className="truncate">{pdf.name}</span>
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPdf(null)}>
              Remove
            </Button>
          </div>
        ) : (
          <Input
            id="tpl-pdf"
            type="file"
            accept="application/pdf"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy || uploading}>{uploading ? "Uploading…" : "Save template"}</Button>
      </DialogFooter>
    </form>
  );
}
