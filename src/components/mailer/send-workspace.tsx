"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SendIcon } from "lucide-react";

import { PageHeader } from "@/components/mailer/page-header";
import { EmptyState } from "@/components/mailer/ui/empty-state";
import { FeedbackBanner } from "@/components/mailer/ui/feedback-banner";
import { FormField } from "@/components/mailer/ui/form-field";
import { ListSkeleton } from "@/components/mailer/ui/list-skeleton";
import { MailerScreen } from "@/components/mailer/ui/screen";
import { StepHeader } from "@/components/mailer/ui/step-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useMailerFetch } from "@/hooks/use-mailer-fetch";

type Contact = { id: string; email: string; company: string | null; firstName: string | null };
type Template = { id: string; name: string };
type SmtpProfile = { id: string; label: string; isValid: boolean };

type ContactsResponse = { contacts: Contact[] };
type TemplatesResponse = { templates: Template[] };
type SmtpResponse = { profiles: SmtpProfile[] };

export function SendWorkspace() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"all" | "filter" | "pick">("all");
  const [companyFilter, setCompanyFilter] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [templateId, setTemplateId] = useState("");
  const [smtpProfileId, setSmtpProfileId] = useState("");
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const { data: contactsData, loading: contactsLoading } =
    useMailerFetch<ContactsResponse>("/api/v1/contacts");
  const { data: templatesData, loading: templatesLoading } =
    useMailerFetch<TemplatesResponse>("/api/v1/templates");
  const { data: smtpData, loading: smtpLoading } =
    useMailerFetch<SmtpResponse>("/api/v1/smtp-profiles");

  const contacts = contactsData?.contacts ?? [];
  const templates = templatesData?.templates ?? [];
  const validSmtp = (smtpData?.profiles ?? []).filter((p) => p.isValid);

  const recipientCount = useMemo(() => {
    if (mode === "all") return contacts.length;
    if (mode === "filter" && companyFilter) {
      return contacts.filter((c) =>
        (c.company ?? "").toLowerCase().includes(companyFilter.toLowerCase()),
      ).length;
    }
    if (mode === "pick") {
      return Object.values(picked).filter(Boolean).length;
    }
    return 0;
  }, [contacts, mode, companyFilter, picked]);

  const canStep2 = recipientCount > 0;
  const canStep3 = templateId && smtpProfileId && validSmtp.length > 0;

  async function sendCampaign() {
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/v1/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `Campaign ${new Date().toLocaleString()}`,
        templateId,
        smtpProfileId,
        recipientMode: mode,
        companyFilter: mode === "filter" ? companyFilter : undefined,
        contactIds:
          mode === "pick"
            ? contacts.filter((c) => picked[c.id]).map((c) => c.id)
            : undefined,
        skipAlreadySent,
        sendNow: true,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setFeedback({ tone: "error", message: data.error ?? "Send failed." });
      return;
    }
    const data = (await response.json()) as { async?: boolean; campaign?: { id: string } };
    if (data.async) {
      setFeedback({
        tone: "success",
        message:
          "Campaign started in the background. Open Home to watch live progress.",
      });
      router.push("/");
      return;
    }
    setFeedback({ tone: "success", message: "Campaign saved as draft." });
    setStep(1);
  }

  const loading = contactsLoading || templatesLoading || smtpLoading;

  return (
    <MailerScreen>
      <PageHeader
        title="Send"
        description="Three steps: pick people, pick template & SMTP, confirm. Each email is sent individually with your template."
      />

      {loading ? <ListSkeleton rows={3} /> : null}

      {!loading && contacts.length === 0 ? (
        <EmptyState
          icon={SendIcon}
          title="Add contacts first"
          description="Go to Contacts to import emails before you can send."
        />
      ) : null}

      {!loading && contacts.length > 0 ? (
        <>
          {step === 1 ? (
            <section className="flex flex-col gap-4">
              <StepHeader
                step={1}
                total={3}
                title="Who receives this?"
                subtitle="All contacts, filter by company, or hand-pick checkboxes."
              />

              <div className="grid grid-cols-3 gap-2">
                {(["all", "filter", "pick"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={mode === value ? "default" : "outline"}
                    className="h-12 capitalize"
                    onClick={() => setMode(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>

              {mode === "filter" ? (
                <FormField label="Company contains">
                  <Input
                    className="h-12"
                    placeholder="Acme"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  />
                </FormField>
              ) : null}

              {mode === "pick" ? (
                <Card>
                  <CardContent className="max-h-64 space-y-2 overflow-y-auto p-3">
                    {contacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex min-h-11 items-center gap-3 rounded-lg border border-border/60 px-3 text-sm active:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={Boolean(picked[contact.id])}
                          onChange={(e) =>
                            setPicked((prev) => ({
                              ...prev,
                              [contact.id]: e.target.checked,
                            }))
                          }
                        />
                        <span className="min-w-0 truncate">{contact.email}</span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <p className="text-center text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{recipientCount}</span>{" "}
                recipient{recipientCount === 1 ? "" : "s"} selected
              </p>

              <Button
                className="h-12 w-full"
                disabled={!canStep2}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="flex flex-col gap-4">
              <StepHeader
                step={2}
                total={3}
                title="Template & SMTP"
                subtitle="Only validated SMTP profiles can send."
              />

              {validSmtp.length === 0 ? (
                <FeedbackBanner
                  tone="info"
                  message="Validate SMTP under Setup before sending."
                />
              ) : null}

              <FormField label="Template">
                <select
                  className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
                  value={templateId || templates[0]?.id || ""}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Validated SMTP">
                <select
                  className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
                  value={smtpProfileId || validSmtp[0]?.id || ""}
                  onChange={(e) => setSmtpProfileId(e.target.value)}
                >
                  {validSmtp.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border/70 px-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={skipAlreadySent}
                  onChange={(e) => setSkipAlreadySent(e.target.checked)}
                />
                Skip if this template was already sent to that email
              </label>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="h-12"
                  disabled={!canStep3 && templates.length > 0 && validSmtp.length > 0}
                  onClick={() => {
                    if (!templateId && templates[0]) setTemplateId(templates[0].id);
                    if (!smtpProfileId && validSmtp[0]) setSmtpProfileId(validSmtp[0].id);
                    setStep(3);
                  }}
                >
                  Review
                </Button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="flex flex-col gap-4">
              <StepHeader
                step={3}
                total={3}
                title="Confirm & send"
                subtitle="We loop one-by-one so each message is personal."
              />
              <Card className="mailer-surface-panel border border-border/60">
                <CardContent className="grid gap-2 py-4 text-sm">
                  <Row label="Recipients" value={String(recipientCount)} />
                  <Row
                    label="Template"
                    value={templates.find((t) => t.id === templateId)?.name ?? "—"}
                  />
                  <Row
                    label="SMTP"
                    value={validSmtp.find((p) => p.id === smtpProfileId)?.label ?? "—"}
                  />
                  <Row label="Skip duplicates" value={skipAlreadySent ? "Yes" : "No"} />
                </CardContent>
              </Card>

              {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="h-12 gap-2"
                  disabled={busy || !canStep3}
                  onClick={() => void sendCampaign()}
                >
                  {busy ? <Spinner className="size-5" /> : <SendIcon className="size-4" />}
                  Send loop
                </Button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </MailerScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}