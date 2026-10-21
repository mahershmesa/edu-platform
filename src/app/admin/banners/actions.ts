"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { bool, int, optStr } from "@/lib/utils";
import { isSafeUrl } from "@/lib/url";
import { resolveImage } from "@/server/courses";

const dateOrNull = z
  .string()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "تاريخ غير صالح" });
      return z.NEVER;
    }
    return d;
  });

const schema = z
  .object({
    title: z.string().trim().max(120).nullable(),
    description: z.string().trim().max(300).nullable(),
    link: z.string().trim().nullable().refine((v) => !v || isSafeUrl(v), "الرابط غير صالح (يبدأ بـ https:// أو /)"),
    sortOrder: z.number().int().min(0).max(9999),
    isActive: z.boolean(),
    startsAt: dateOrNull,
    endsAt: dateOrNull,
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt, { path: ["endsAt"], message: "تاريخ النهاية يجب أن يكون بعد البداية" });

function parse(form: FormData) {
  return schema.safeParse({
    title: optStr(form, "title"),
    description: optStr(form, "description"),
    link: optStr(form, "link"),
    sortOrder: int(form, "sortOrder") ?? 0,
    isActive: bool(form, "isActive"),
    startsAt: optStr(form, "startsAt"),
    endsAt: optStr(form, "endsAt"),
  });
}

function revalidate() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function createBanner(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("ads.write");
  const parsed = parse(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  const img = await resolveImage(form, { ownerId: user.id, groupName: "ad-images" });
  if ("error" in img) return fail("تحقق من الحقول", { imageFile: img.error });
  if (!img.url) return fail("تحقق من الحقول", { imageFile: "ارفع صورة الإعلان أو ضع رابطها" });
  const b = await db.banner.create({ data: { ...parsed.data, imageUrl: img.url } });
  await audit(user, "banner.create", "Banner", b.id);
  revalidate();
  return done("تمت إضافة الإعلان");
}

export async function updateBanner(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("ads.write");
  const existing = await db.banner.findUnique({ where: { id } });
  if (!existing) return fail("الإعلان غير موجود");
  const parsed = parse(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  const img = await resolveImage(form, { ownerId: user.id, groupName: "ad-images", keep: existing.imageUrl });
  if ("error" in img) return fail("تحقق من الحقول", { imageFile: img.error });
  await db.banner.update({ where: { id }, data: { ...parsed.data, imageUrl: img.url ?? existing.imageUrl } });
  await audit(user, "banner.update", "Banner", id);
  revalidate();
  return done("تم حفظ التعديلات");
}

export async function toggleBanner(id: string): Promise<ActionState> {
  const user = await requirePermission("ads.write");
  const b = await db.banner.findUnique({ where: { id } });
  if (!b) return fail("الإعلان غير موجود");
  await db.banner.update({ where: { id }, data: { isActive: !b.isActive } });
  await audit(user, "banner.toggle", "Banner", id);
  revalidate();
  return done(b.isActive ? "تم إخفاء الإعلان" : "تم تفعيل الإعلان");
}

export async function deleteBanner(id: string): Promise<ActionState> {
  const user = await requirePermission("ads.delete");
  const b = await db.banner.findUnique({ where: { id } });
  if (!b) return fail("الإعلان غير موجود");
  await db.banner.delete({ where: { id } });
  await audit(user, "banner.delete", "Banner", id);
  revalidate();
  return done("تم حذف الإعلان");
}
