"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { bool, int, optStr, str } from "@/lib/utils";
import { parseYouTubeId } from "@/lib/youtube";

const SUSPENDED = "حسابك موقوف حالياً، لا يمكنك إضافة أو تعديل المحتوى.";

/** Parse a YouTube link and try to fetch its title (best effort; network may be unavailable). */
export async function verifyYouTube(url: string): Promise<{ ok: boolean; id?: string; title?: string; error?: string }> {
  await requireTeacher();
  const id = parseYouTubeId(url);
  if (!id) return { ok: false, error: "رابط يوتيوب غير صالح" };
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      { signal: AbortSignal.timeout(4000), cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as { title?: string };
      return { ok: true, id, title: data.title };
    }
    if (res.status === 404 || res.status === 401 || res.status === 403) {
      // Private/unlisted-with-embedding-off videos can still be valid ids; keep going.
      return { ok: true, id };
    }
  } catch {
    // network blocked or timeout: the id itself is still valid
  }
  return { ok: true, id };
}

const schema = z.object({
  courseId: z.string().min(1, "اختر الدورة"),
  title: z.string().trim().min(2, "عنوان الدرس مطلوب").max(200),
  youtubeId: z.string({ message: "رابط يوتيوب غير صالح" }).regex(/^[\w-]{11}$/, "رابط يوتيوب غير صالح"),
  description: z.string().trim().max(5000).nullable(),
  sortOrder: z.number().int().min(0).max(100000).nullable(),
  durationMin: z.number().int().min(0, "المدة غير صالحة").max(1000, "المدة كبيرة جداً").nullable(),
  attachmentId: z.string().nullable(),
  isFree: z.boolean(),
  isPublished: z.boolean(),
});

async function parse(user: CurrentUser, form: FormData) {
  const parsed = schema.safeParse({
    courseId: str(form, "courseId"),
    title: str(form, "title"),
    youtubeId: parseYouTubeId(str(form, "youtube")) ?? undefined,
    description: optStr(form, "description"),
    sortOrder: int(form, "sortOrder"),
    durationMin: int(form, "durationMin"),
    attachmentId: optStr(form, "attachmentId"),
    isFree: bool(form, "isFree"),
    isPublished: bool(form, "isPublished"),
  });
  if (!parsed.success) {
    const r = zodFail(parsed.error.issues);
    if (r.fieldErrors?.youtubeId) r.fieldErrors.youtube = r.fieldErrors.youtubeId;
    return { error: r };
  }
  const course = await db.course.findFirst({ where: { id: parsed.data.courseId, teacherId: user.id } });
  if (!course) return { error: fail("تحقق من الحقول", { courseId: "الدورة غير موجودة" }) };
  if (parsed.data.attachmentId) {
    const file = await db.mediaFile.findFirst({ where: { id: parsed.data.attachmentId, ownerId: user.id } });
    if (!file) return { error: fail("تحقق من الحقول", { attachmentId: "الملف غير موجود" }) };
  }
  return { data: parsed.data };
}

async function ownLesson(user: CurrentUser, id: string) {
  return db.lesson.findFirst({ where: { id, course: { teacherId: user.id } } });
}

function revalidate(courseId: string) {
  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/courses/${courseId}`);
  revalidatePath("/teacher/courses");
}

export async function createLesson(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const p = await parse(user, form);
  if ("error" in p) return p.error!;
  let { sortOrder } = p.data;
  if (sortOrder === null) {
    const last = await db.lesson.aggregate({ where: { courseId: p.data.courseId }, _max: { sortOrder: true } });
    sortOrder = (last._max.sortOrder ?? 0) + 1;
  }
  const lesson = await db.lesson.create({ data: { ...p.data, sortOrder } });
  await audit(user, "lesson.create", "Lesson", lesson.id, { title: lesson.title });
  revalidate(lesson.courseId);
  return done("تمت إضافة الدرس");
}

export async function updateLesson(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const existing = await ownLesson(user, id);
  if (!existing) return fail("الدرس غير موجود");
  const p = await parse(user, form);
  if ("error" in p) return p.error!;
  await db.lesson.update({ where: { id }, data: { ...p.data, sortOrder: p.data.sortOrder ?? existing.sortOrder } });
  await audit(user, "lesson.update", "Lesson", id);
  revalidate(existing.courseId);
  if (existing.courseId !== p.data.courseId) revalidate(p.data.courseId);
  return done("تم حفظ التعديلات");
}

export async function toggleLessonPublished(id: string): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const lesson = await ownLesson(user, id);
  if (!lesson) return fail("الدرس غير موجود");
  await db.lesson.update({ where: { id }, data: { isPublished: !lesson.isPublished } });
  await audit(user, lesson.isPublished ? "lesson.unpublish" : "lesson.publish", "Lesson", id);
  revalidate(lesson.courseId);
  return done(lesson.isPublished ? "تم إلغاء نشر الدرس" : "تم نشر الدرس");
}

export async function deleteLesson(id: string): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const lesson = await ownLesson(user, id);
  if (!lesson) return fail("الدرس غير موجود");
  await db.lesson.delete({ where: { id } });
  await audit(user, "lesson.delete", "Lesson", id, { title: lesson.title });
  revalidate(lesson.courseId);
  return done("تم حذف الدرس");
}

/** Swap the lesson with its neighbour in the same course. */
export async function moveLesson(id: string, direction: "up" | "down"): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  const lesson = await ownLesson(user, id);
  if (!lesson) return fail("الدرس غير موجود");
  const siblings = await db.lesson.findMany({ where: { courseId: lesson.courseId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const idx = siblings.findIndex((l) => l.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return done("الدرس في مكانه");
  // Renumber 1..n with the two swapped so duplicate sortOrders are fixed too.
  const order = siblings.map((l) => l.id);
  [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
  await db.$transaction(order.map((lid, i) => db.lesson.update({ where: { id: lid }, data: { sortOrder: i + 1 } })));
  revalidate(lesson.courseId);
  return done("تم تغيير الترتيب");
}
