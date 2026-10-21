"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { int, optStr, str } from "@/lib/utils";
import { resolveImage } from "@/server/courses";

const SUSPENDED = "حسابك موقوف حالياً، لا يمكنك إضافة أو تعديل المحتوى.";

const schema = z.object({
  title: z.string().trim().min(3, "العنوان قصير جداً").max(120, "العنوان طويل جداً"),
  description: z.string().trim().max(5000).nullable(),
  price: z.number({ message: "أدخل السعر" }).int("السعر عدد صحيح").min(0, "السعر لا يكون سالباً").max(100_000_000, "السعر كبير جداً"),
  categoryId: z.string().min(1, "اختر الفئة"),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
});

async function parse(form: FormData) {
  const parsed = schema.safeParse({
    title: str(form, "title"),
    description: optStr(form, "description"),
    price: int(form, "price") ?? undefined,
    categoryId: str(form, "categoryId"),
    status: str(form, "status") || "DRAFT",
  });
  if (!parsed.success) return { error: zodFail(parsed.error.issues) };
  const cat = await db.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!cat) return { error: fail("تحقق من الحقول", { categoryId: "الفئة غير موجودة" }) };
  return { data: parsed.data };
}

function revalidate(id?: string) {
  revalidatePath("/teacher/courses");
  revalidatePath("/teacher");
  if (id) revalidatePath(`/teacher/courses/${id}`);
}

export async function createTeacherCourse(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const p = await parse(form);
  if ("error" in p) return p.error!;
  const img = await resolveImage(form, { ownerId: user.id, groupName: "course-images" });
  if ("error" in img) return fail("تحقق من الحقول", { imageFile: img.error });
  const course = await db.course.create({ data: { ...p.data, imageUrl: img.url, teacherId: user.id } });
  await audit(user, "course.create", "Course", course.id, { title: course.title });
  revalidate();
  return done("تمت إضافة الدورة");
}

export async function updateTeacherCourse(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const existing = await db.course.findFirst({ where: { id, teacherId: user.id } });
  if (!existing) return fail("الدورة غير موجودة");
  const p = await parse(form);
  if ("error" in p) return p.error!;
  const img = await resolveImage(form, { ownerId: user.id, groupName: "course-images" });
  if ("error" in img) return fail("تحقق من الحقول", { imageFile: img.error });
  await db.course.update({ where: { id }, data: { ...p.data, imageUrl: img.url } });
  await audit(user, "course.update", "Course", id);
  revalidate(id);
  return done("تم حفظ التعديلات");
}

export async function setTeacherCourseStatus(id: string, status: "PUBLISHED" | "HIDDEN" | "DRAFT"): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const existing = await db.course.findFirst({ where: { id, teacherId: user.id } });
  if (!existing) return fail("الدورة غير موجودة");
  await db.course.update({ where: { id }, data: { status } });
  await audit(user, "course.status", "Course", id, { status });
  revalidate(id);
  return done(status === "PUBLISHED" ? "تم نشر الدورة" : "تم إخفاء الدورة");
}
