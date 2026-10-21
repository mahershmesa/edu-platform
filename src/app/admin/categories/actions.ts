"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { bool, int, optStr, str } from "@/lib/utils";
import { isSafeUrl } from "@/lib/url";
import { parseYouTubeId } from "@/lib/youtube";

const schema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(60),
  description: z.string().trim().max(300).nullable(),
  imageUrl: z.string().trim().nullable().refine((v) => !v || isSafeUrl(v), "رابط الصورة غير صالح"),
  introVideo: z.string().trim().nullable().refine((v) => !v || parseYouTubeId(v) !== null, "رابط يوتيوب غير صالح"),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
  parentId: z.string().nullable(),
});

function parse(form: FormData) {
  return schema.safeParse({
    name: str(form, "name"),
    description: optStr(form, "description"),
    imageUrl: optStr(form, "imageUrl"),
    introVideo: optStr(form, "introVideo"),
    sortOrder: int(form, "sortOrder") ?? 0,
    isActive: bool(form, "isActive"),
    parentId: optStr(form, "parentId"),
  });
}

export async function createCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("categories.write");
  const parsed = parse(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  if (parsed.data.parentId) {
    const parent = await db.category.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.parentId) return fail("الفئة الأب غير صالحة (مستويان فقط)");
  }
  const c = await db.category.create({ data: parsed.data });
  await audit(user, "category.create", "Category", c.id, { name: c.name });
  revalidatePath("/admin/categories");
  return done(parsed.data.parentId ? "تمت إضافة الفئة الفرعية" : "تمت إضافة الفئة");
}

export async function updateCategory(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("categories.write");
  const parsed = parse(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) return fail("الفئة غير موجودة");
  await db.category.update({ where: { id }, data: { ...parsed.data, parentId: existing.parentId } });
  await audit(user, "category.update", "Category", id);
  revalidatePath("/admin/categories");
  return done("تم حفظ التعديلات");
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const user = await requirePermission("categories.delete");
  const cat = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { courses: true } }, children: { include: { _count: { select: { courses: true } } } } },
  });
  if (!cat) return fail("الفئة غير موجودة");
  const courseCount = cat._count.courses + cat.children.reduce((n, c) => n + c._count.courses, 0);
  if (courseCount > 0) return fail(`لا يمكن الحذف: توجد ${courseCount} دورة مرتبطة بهذه الفئة. انقلها أولاً.`);
  await db.category.delete({ where: { id } });
  await audit(user, "category.delete", "Category", id, { name: cat.name });
  revalidatePath("/admin/categories");
  return done("تم حذف الفئة");
}
