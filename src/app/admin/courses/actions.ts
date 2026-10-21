"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { int, optStr, str } from "@/lib/utils";
import { resolveImage } from "@/server/courses";

const schema = z.object({
  title: z.string().trim().min(3, "العنوان قصير جداً").max(120, "العنوان طويل جداً"),
  description: z.string().trim().max(5000).nullable(),
  price: z.number({ message: "أدخل السعر" }).int("السعر عدد صحيح").min(0, "السعر لا يكون سالباً").max(100_000_000, "السعر كبير جداً"),
  categoryId: z.string().min(1, "اختر الفئة"),
  teacherId: z.string().min(1, "اختر المعلم"),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
});

async function parse(form: FormData) {
  const parsed = schema.safeParse({
    title: str(form, "title"),
    description: optStr(form, "description"),
    price: int(form, "price") ?? undefined,
    categoryId: str(form, "categoryId"),
    teacherId: str(form, "teacherId"),
    status: str(form, "status") || "DRAFT",
  });
  if (!parsed.success) return { error: zodFail(parsed.error.issues) };
  const [cat, teacher] = await Promise.all([
    db.category.findUnique({ where: { id: parsed.data.categoryId } }),
    db.user.findFirst({ where: { id: parsed.data.teacherId, type: "TEACHER" } }),
  ]);
  if (!cat) return { error: fail("تحقق من الحقول", { categoryId: "الفئة غير موجودة" }) };
  if (!teacher) return { error: fail("تحقق من الحقول", { teacherId: "المعلم غير موجود" }) };
  return { data: parsed.data };
}

export async function createCourse(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("courses.write");
  const p = await parse(form);
  if ("error" in p) return p.error!;
  const img = await resolveImage(form, { ownerId: user.id, groupName: "course-images" });
  if ("error" in img) return fail("تحقق من الحقول", { imageFile: img.error });
  const course = await db.course.create({ data: { ...p.data, imageUrl: img.url } });
  await audit(user, "course.create", "Course", course.id, { title: course.title });
  revalidatePath("/admin/courses");
  return done("تمت إضافة الدورة");
}

export async function updateCourse(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("courses.write");
  const existing = await db.course.findUnique({ where: { id } });
  if (!existing) return fail("الدورة غير موجودة");
  const p = await parse(form);
  if ("error" in p) return p.error!;
  const img = await resolveImage(form, { ownerId: user.id, groupName: "course-images" });
  if ("error" in img) return fail("تحقق من الحقول", { imageFile: img.error });
  await db.course.update({ where: { id }, data: { ...p.data, imageUrl: img.url } });
  await audit(user, "course.update", "Course", id);
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
  return done("تم حفظ التعديلات");
}

export async function deleteCourse(id: string): Promise<ActionState> {
  const user = await requirePermission("courses.delete");
  const course = await db.course.findUnique({ where: { id }, include: { _count: { select: { enrollments: true } } } });
  if (!course) return fail("الدورة غير موجودة");
  if (course._count.enrollments > 0) {
    return fail(`لا يمكن حذف دورة فيها ${course._count.enrollments} طالب مشترك. غيّر حالتها إلى "مخفية" بدلاً من الحذف.`);
  }
  await db.course.delete({ where: { id } });
  await audit(user, "course.delete", "Course", id, { title: course.title });
  revalidatePath("/admin/courses");
  return done("تم حذف الدورة");
}
