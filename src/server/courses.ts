import "server-only";
import { db } from "@/lib/db";
import { isSafeUrl } from "@/lib/url";
import { hasFile, saveUpload, UploadError } from "./uploads";

export type CategoryOption = { id: string; name: string; children: { id: string; name: string }[] };

/** Root categories with their subcategories, for grouped selects. */
export async function categoryOptions(): Promise<CategoryOption[]> {
  const roots = await db.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } } },
  });
  return roots;
}

export function categoryPath(cat: { name: string; parent?: { name: string } | null }): string {
  return cat.parent ? `${cat.parent.name} / ${cat.name}` : cat.name;
}

/**
 * Resolve an image from a form: an uploaded file field (`fileField`) wins over a URL field (`urlField`).
 * Returns { url } (possibly null to clear), or { error }.
 * When neither is provided, returns { url: keep } so edits keep the current image.
 */
export async function resolveImage(
  form: FormData,
  opts: { ownerId: string; fileField?: string; urlField?: string; keep?: string | null; groupName?: string },
): Promise<{ url: string | null } | { error: string }> {
  const file = form.get(opts.fileField ?? "imageFile");
  if (hasFile(file)) {
    try {
      const { url } = await saveUpload(file, { ownerId: opts.ownerId, groupName: opts.groupName ?? null, isPublic: true });
      return { url };
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      throw e;
    }
  }
  const raw = form.get(opts.urlField ?? "imageUrl");
  const url = typeof raw === "string" ? raw.trim() : "";
  if (url === "") return { url: opts.keep ?? null };
  if (!isSafeUrl(url)) return { error: "رابط الصورة غير صالح" };
  return { url };
}

export const COURSE_STATUS_LABELS = { DRAFT: "مسودة", PUBLISHED: "منشورة", HIDDEN: "مخفية" } as const;
export const COURSE_STATUS_TONES = { DRAFT: "gray", PUBLISHED: "green", HIDDEN: "amber" } as const;
