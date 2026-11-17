"use client";

import { useState } from "react";
import { FileTextIcon, ServerIcon } from "lucide-react";

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

type SmtpProfile = {
  id: string;
  label: string;
  host: string;
  port: number;
  isValid: boolean;
  validationError: string | null;
  lastValidatedAt: string | null;
};

type Template = {
  id: string;
  name: string;
  format: string;
  subject: string;
  pdfFileId: string | null;
};

type SmtpResponse = { profiles: SmtpProfile[] };
type TemplatesResponse = { templates: Template[] };

export function SetupWorkspace() {
  const [tab, setTab] = useState<"smtp" | "templates">("smtp");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(
    "Hi {{firstName}},\n\nWe wanted to reach out from {{company}}.\n\n— {{senderName}}",
  );
  const [format, setFormat] = useState<"html" | "text">("text");
  const [pdfFileId, setPdfFileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const {
    data: smtpData,
    loading: smtpLoading,
    reload: reloadSmtp,
  } = useMailerFetch<SmtpResponse>("/api/v1/smtp-profiles", { skip: tab !== "smtp" });
  const {
    data: templateData,
    loading: templateLoading,
    reload: reloadTemplates,
  } = useMailerFetch<TemplatesResponse>("/api/v1/templates", {
    skip: tab !== "templates",
  });

  async function saveSmtp() {
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/v1/smtp-profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        username,
        password,
        fromEmail,
        fromName: fromName || undefined,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setFeedback({ tone: "error", message: "Could not save SMTP profile." });
      return;
    }
    setPassword("");
    setFeedback({
      tone: "info",
      message: "Saved. Tap Validate mail on the profile to confirm credentials.",
    });
    await reloadSmtp();
  }

  async function validateProfile(id: string) {
    setBusy(true);
    const response = await fetch(`/api/v1/smtp-profiles/${id}/validate`, {
      method: "POST",
    });
    setBusy(false);
    const data = (await response.json()) as {
      result?: { ok: boolean; validationError?: string | null };
    };
    setFeedback(
      data.result?.ok
        ? { tone: "success", message: "SMTP credentials verified — you can send mail." }
        : {
            tone: "error",
            message: data.result?.validationError ?? "Validation failed.",
          },
    );
    await reloadSmtp();
  }

  async function uploadPdf(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/v1/files", { method: "POST", body: form });
    setBusy(false);
    if (!response.ok) {
      setFeedback({ tone: "error", message: "PDF upload failed." });
      return;
    }
    const data = (await response.json()) as { file: { id: string } };
    setPdfFileId(data.file.id);
    setFeedback({ tone: "success", message: "PDF will attach to the next template you save." });
  }

  async function saveTemplate() {
    setBusy(true);
    const response = await fetch("/api/v1/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: templateName,
        format,
        subject,
        bodyText: format === "text" ? body : undefined,
        bodyHtml: format === "html" ? body : undefined,
        pdfFileId,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setFeedback({ tone: "error", message: "Could not save template." });
      return;
    }
    setTemplateName("");
    setPdfFileId(null);
    setFeedback({ tone: "success", message: "Template saved to your library." });
    await reloadTemplates();
  }

  return (
    <MailerScreen>
      <PageHeader
        title="Setup"
        description="Connect SMTP, validate credentials, build HTML or plain templates, and attach PDFs."
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "smtp", label: "SMTP" },
          { value: "templates", label: "Templates" },
        ]}
      />

      {feedback ? (
        <FeedbackBanner tone={feedback.tone} message={feedback.message} />
      ) : null}

      {tab === "smtp" ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ServerIcon className="size-4 text-brand-blue" />
                New SMTP profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField label="Host" hint="e.g. smtp.gmail.com">
                <Input className="h-12" value={host} onChange={(e) => setHost(e.target.value)} />
              </FormField>
              <FormField label="Port" hint="587 (TLS) or 465 (SSL)">
                <Input className="h-12" inputMode="numeric" value={port} onChange={(e) => setPort(e.target.value)} />
              </FormField>
              <FormField label="Username">
                <Input className="h-12" value={username} onChange={(e) => setUsername(e.target.value)} />
              </FormField>
              <FormField label="Password">
                <Input
                  className="h-12"
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <FormField label="From email">
                <Input
                  className="h-12"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </FormField>
              <FormField label="From name (optional)">
                <Input className="h-12" value={fromName} onChange={(e) => setFromName(e.target.value)} />
              </FormField>
              <Button className="h-12 w-full text-base" disabled={busy} onClick={() => void saveSmtp()}>
                {busy ? <Spinner className="size-5" /> : "Save SMTP"}
              </Button>
            </CardContent>
          </Card>

          {smtpLoading ? (
            <ListSkeleton rows={2} />
          ) : (smtpData?.profiles.length ?? 0) === 0 ? (
            <EmptyState
              icon={ServerIcon}
              title="No SMTP profiles"
              description="Add credentials above, then validate before sending."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {smtpData?.profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{profile.label}</p>
                      <Badge
                        variant="secondary"
                        className={
                          profile.isValid
                            ? "border-brand-green/30 bg-brand-green-muted"
                            : "border-border"
                        }
                      >
                        {profile.isValid ? "Validated" : "Not validated"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {profile.host}:{profile.port}
                    </p>
                    {profile.validationError ? (
                      <p className="text-xs text-destructive">{profile.validationError}</p>
                    ) : null}
                    <Button
                      variant="outline"
                      className="h-11 w-full"
                      disabled={busy}
                      onClick={() => void validateProfile(profile.id)}
                    >
                      Validate mail
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileTextIcon className="size-4 text-brand-green" />
                New template
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={format === "text" ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setFormat("text")}
                >
                  Plain text
                </Button>
                <Button
                  type="button"
                  variant={format === "html" ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setFormat("html")}
                >
                  HTML
                </Button>
              </div>
              <FormField
                label="Template name"
                hint="Shown when you choose a template to send."
              >
                <Input
                  className="h-12"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </FormField>
              <FormField label="Subject" hint="Supports {{firstName}}, {{company}}, etc.">
                <Input className="h-12" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </FormField>
              <FormField label="Body">
                <textarea
                  className="min-h-40 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </FormField>
              <FormField label="PDF attachment (optional)">
                <Input
                  className="h-12"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPdf(file);
                  }}
                />
              </FormField>
              {pdfFileId ? (
                <p className="text-xs text-brand-green">PDF queued for this template.</p>
              ) : null}
              <Button className="h-12 w-full" disabled={busy} onClick={() => void saveTemplate()}>
                Save template
              </Button>
            </CardContent>
          </Card>

          {templateLoading ? (
            <ListSkeleton />
          ) : (templateData?.templates.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileTextIcon}
              title="No templates yet"
              description="Create your first message body above."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {templateData?.templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="py-3">
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.subject}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="secondary">{template.format.toUpperCase()}</Badge>
                      {template.pdfFileId ? (
                        <Badge variant="secondary" className="bg-brand-blue-muted">
                          PDF
                        </Badge>
                      ) : null}
                    </div>
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