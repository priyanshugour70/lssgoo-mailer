import { z } from "zod";

import { requireApiUser } from "@/lib/api/require-user";
import { listCampaignSendsForExport } from "@/service/mailer/campaigns";

function cell(value: string | null) {
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return new Response("Not found", { status: 404 });
  }
  const rows = await listCampaignSendsForExport(auth.user.id, id);
  const lines = [
    "email,status,subject,error,time",
    ...rows.map((r) =>
      [r.email, r.status, r.subject, r.error, r.sentAt.toISOString()].map(cell).join(","),
    ),
  ];
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="campaign-${id.slice(0, 8)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
