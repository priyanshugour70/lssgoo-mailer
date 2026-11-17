import "server-only";

import nodemailer from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string | null;
  fromEmail: string;
};

export function createSmtpTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  } satisfies SMTPTransport.Options);
}

export async function verifySmtp(config: SmtpConfig) {
  const transport = createSmtpTransport(config);
  try {
    await transport.verify();
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP verification failed.";
    return { ok: false as const, error: message };
  } finally {
    transport.close();
  }
}

export async function sendPersonalMail(input: {
  config: SmtpConfig;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; path: string }[];
}) {
  const transport = createSmtpTransport(input.config);
  const from = input.config.fromName
    ? `"${input.config.fromName}" <${input.config.fromEmail}>`
    : input.config.fromEmail;

  try {
    const info = await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    });
    return { ok: true as const, messageId: info.messageId ?? null };
  } finally {
    transport.close();
  }
}

type MailInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; path: string }[];
};

/**
 * One pooled connection for a whole campaign. Opening a new SMTP connection
 * per message is slow and trips provider connection limits.
 */
export function createMailer(config: SmtpConfig) {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    pool: true,
    maxConnections: 2,
    auth: { user: config.username, pass: config.password },
  } satisfies SMTPPool.Options);
  const from = config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail;
  return {
    async send(input: MailInput) {
      const info = await transport.sendMail({ from, ...input });
      return { ok: true as const, messageId: info.messageId ?? null };
    },
    close: () => transport.close(),
  };
}
