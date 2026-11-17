import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { createMailer } from "@/lib/mail/smtp-transport";
import { renderTemplate } from "@/lib/mail/template-render";
import { getUploadedFile } from "@/service/mailer/files";
import { getSmtpForSend } from "@/service/mailer/smtp-profiles";
import { getTemplate } from "@/service/mailer/templates";

export const maxDuration = 60;

const bodySchema = z.object({ smtpProfileId: z.string().uuid() });

/**
 * Sends the template to the signed-in user's own address with sample data, so
 * they can see exactly what recipients will get. Never sends to anyone else.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const template = await getTemplate(auth.user.id, id);
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  const smtp = await getSmtpForSend(auth.user.id, parsed.data.smtpProfileId);
  if (!smtp) {
    return NextResponse.json(
      { error: "Choose a verified sender to send a test." },
      { status: 400 },
    );
  }

  const me = auth.user;
  const recipient = {
    email: me.email,
    firstName: me.firstName ?? me.name.split(" ")[0] ?? null,
    lastName: me.lastName,
    company: "Sample Co",
  };
  const sender = { name: me.name, email: me.email };
  const html =
    template.format === "html" && template.bodyHtml
      ? renderTemplate(template.bodyHtml, recipient, sender, { html: true })
      : undefined;
  const text =
    template.format === "text"
      ? renderTemplate(template.bodyText ?? "", recipient, sender)
      : undefined;

  const file = template.pdfFileId
    ? await getUploadedFile(auth.user.id, template.pdfFileId)
    : null;

  const mailer = createMailer(smtp);
  try {
    await mailer.send({
      to: me.email,
      subject: `[Test] ${renderTemplate(template.subject, recipient, sender)}`,
      html,
      text,
      attachments: file ? [{ filename: "attachment.pdf", path: file.storagePath }] : undefined,
    });
    return NextResponse.json({ ok: true, to: me.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the test.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    mailer.close();
  }
}
