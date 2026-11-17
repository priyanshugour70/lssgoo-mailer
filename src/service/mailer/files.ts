import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { uploadedFiles } from "@/lib/db/schema";

const UPLOAD_ROOT = join(process.cwd(), "storage", "uploads");

export async function savePdfUpload(userId: string, file: File) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF uploads are supported.");
  }
  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("PDF must be 12 MB or smaller.");
  }

  const fileId = randomUUID();
  const dir = join(UPLOAD_ROOT, userId);
  await mkdir(dir, { recursive: true });
  const storagePath = join(dir, `${fileId}.pdf`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  const db = getDb();
  const [row] = await db
    .insert(uploadedFiles)
    .values({
      id: fileId,
      userId,
      originalName: file.name,
      mimeType: "application/pdf",
      storagePath,
      sizeBytes: file.size,
    })
    .returning();

  return row;
}

export async function getUploadedFile(userId: string, fileId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(uploadedFiles)
    .where(eq(uploadedFiles.id, fileId))
    .limit(1);
  if (!row || row.userId !== userId) return null;
  return row;
}