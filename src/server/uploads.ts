import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const DOC_TYPES = ["application/pdf"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export class UploadError extends Error {}

/** True when the form field holds a real uploaded file. */
export function hasFile(v: FormDataEntryValue | null): v is File {
  return typeof v === "object" && v !== null && "size" in v && v.size > 0;
}

/**
 * Save an uploaded file to disk and record it in MediaFile.
 * Returns the public URL (/files/<storedName>). Throws UploadError with an Arabic message.
 */
export async function saveUpload(
  file: File,
  opts: { ownerId: string; allowed?: string[]; maxBytes?: number; groupName?: string | null; isPublic?: boolean },
) {
  const allowed = opts.allowed ?? IMAGE_TYPES;
  const maxBytes = opts.maxBytes ?? MAX_IMAGE_BYTES;
  if (!allowed.includes(file.type)) throw new UploadError("نوع الملف غير مدعوم");
  if (file.size > maxBytes) throw new UploadError(`حجم الملف أكبر من الحد المسموح (${Math.round(maxBytes / 1024 / 1024)}MB)`);

  const storedName = `${randomUUID()}.${EXT[file.type] ?? "bin"}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
  const media = await db.mediaFile.create({
    data: {
      ownerId: opts.ownerId,
      originalName: file.name.slice(0, 200) || storedName,
      storedName,
      mimeType: file.type,
      size: file.size,
      groupName: opts.groupName ?? null,
      isPublic: opts.isPublic ?? true,
    },
  });
  return { media, url: `/files/${storedName}` };
}

export async function deleteUpload(storedName: string) {
  await db.mediaFile.deleteMany({ where: { storedName } });
  try {
    await unlink(path.join(UPLOAD_DIR, path.basename(storedName)));
  } catch {
    // already gone
  }
}
