import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeIraqiPhone } from "@/lib/phone";
import { optStr, str } from "@/lib/utils";
import { isSafeUrl } from "@/lib/url";
import { hasFile, saveUpload, UploadError } from "@/server/uploads";

export const passwordSchema = z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(100, "كلمة المرور طويلة جداً");

export type ParsedUserFields = {
  name: string;
  email: string | null;
  phone: string | null;
};

/**
 * Validate the common name/email/phone fields of a user form.
 * Returns field errors (Arabic) or the normalized values. Checks uniqueness, excluding `excludeId`.
 */
export async function parseUserIdentity(
  form: FormData,
  opts: { excludeId?: string; requireContact?: boolean } = {},
): Promise<{ ok: true; data: ParsedUserFields } | { ok: false; fieldErrors: Record<string, string> }> {
  const fieldErrors: Record<string, string> = {};
  const name = str(form, "name");
  if (name.length < 2) fieldErrors.name = "الاسم مطلوب";
  if (name.length > 80) fieldErrors.name = "الاسم طويل جداً";

  const rawEmail = optStr(form, "email")?.toLowerCase() ?? null;
  let email: string | null = null;
  if (rawEmail) {
    const e = z.string().email().safeParse(rawEmail);
    if (!e.success) fieldErrors.email = "البريد غير صالح";
    else email = e.data;
  }

  const rawPhone = optStr(form, "phone");
  let phone: string | null = null;
  if (rawPhone) {
    phone = normalizeIraqiPhone(rawPhone);
    if (!phone) fieldErrors.phone = "أدخل رقم هاتف عراقي صحيح (07XXXXXXXXX)";
  }

  if ((opts.requireContact ?? true) && !rawEmail && !rawPhone) {
    fieldErrors.email = "أدخل البريد أو رقم الهاتف";
  }

  if (email && !fieldErrors.email) {
    const exists = await db.user.findFirst({ where: { email, ...(opts.excludeId && { id: { not: opts.excludeId } }) } });
    if (exists) fieldErrors.email = "هذا البريد مستخدم مسبقاً";
  }
  if (phone && !fieldErrors.phone) {
    const exists = await db.user.findFirst({ where: { phone, ...(opts.excludeId && { id: { not: opts.excludeId } }) } });
    if (exists) fieldErrors.phone = "هذا الرقم مستخدم مسبقاً";
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, data: { name, email, phone } };
}

/** Resolve the avatar from either an uploaded file ("avatarFile") or a URL ("avatarUrl"). */
export async function resolveAvatar(
  form: FormData,
  ownerId: string,
  current: string | null,
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  const file = form.get("avatarFile");
  if (hasFile(file)) {
    try {
      const { url } = await saveUpload(file, { ownerId, groupName: "avatars", isPublic: true });
      return { ok: true, url };
    } catch (e) {
      if (e instanceof UploadError) return { ok: false, error: e.message };
      throw e;
    }
  }
  if (!form.has("avatarUrl")) return { ok: true, url: current };
  const url = optStr(form, "avatarUrl");
  if (url && !isSafeUrl(url)) return { ok: false, error: "رابط الصورة غير صالح" };
  return { ok: true, url };
}

/** Latin slug from a string; falls back to a random suffix for Arabic-only names. */
export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s;
}
