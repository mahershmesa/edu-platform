"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { QuestionType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { bool, int, optStr, str } from "@/lib/utils";
import { isSafeUrl } from "@/lib/url";
import { validateQuestion } from "@/lib/domain/exams";
import { getOwnedExam } from "@/server/exams";
import { hasFile, saveUpload, UploadError } from "@/server/uploads";

const LOCKED = "حسابك موقوف حالياً، لا يمكنك تعديل المحتوى.";

const settingsSchema = z.object({
  title: z.string().trim().min(2, "عنوان الامتحان مطلوب").max(120),
  description: z.string().trim().max(1000).nullable(),
  durationMin: z.number({ message: "المدة مطلوبة" }).int().min(1, "دقيقة واحدة على الأقل").max(600, "الحد الأقصى 600 دقيقة"),
  passPercent: z.number({ message: "درجة النجاح مطلوبة" }).int().min(1, "بين 1 و100").max(100, "بين 1 و100"),
  maxAttempts: z.number().int().min(1, "محاولة واحدة على الأقل").max(100).nullable(),
  shuffle: z.boolean(),
  showAnswers: z.boolean(),
  isActive: z.boolean(),
  lessonId: z.string().nullable(),
});

function parseSettings(form: FormData) {
  return settingsSchema.safeParse({
    title: str(form, "title"),
    description: optStr(form, "description"),
    durationMin: int(form, "durationMin") ?? undefined,
    passPercent: int(form, "passPercent") ?? undefined,
    maxAttempts: int(form, "maxAttempts"),
    shuffle: bool(form, "shuffle"),
    showAnswers: bool(form, "showAnswers"),
    isActive: bool(form, "isActive"),
    lessonId: optStr(form, "lessonId"),
  });
}

async function lessonBelongs(lessonId: string | null, courseId: string) {
  if (!lessonId) return true;
  return (await db.lesson.count({ where: { id: lessonId, courseId } })) > 0;
}

async function editableExam(user: CurrentUser, examId: string) {
  if (!teacherCanEdit(user)) return { error: LOCKED } as const;
  const exam = await getOwnedExam(user.id, examId);
  if (!exam) return { error: "الامتحان غير موجود" } as const;
  return { exam } as const;
}

export async function createExam(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  if (!teacherCanEdit(user)) return fail(LOCKED);
  const courseId = str(form, "courseId");
  const course = await db.course.findFirst({ where: { id: courseId, teacherId: user.id } });
  if (!course) return fail("اختر دورة من دوراتك", { courseId: "اختر الدورة" });
  const parsed = parseSettings(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  if (!(await lessonBelongs(parsed.data.lessonId, course.id))) return fail("الدرس المختار لا يتبع هذه الدورة", { lessonId: "درس غير صالح" });
  const exam = await db.exam.create({ data: { ...parsed.data, courseId: course.id } });
  await audit(user, "exam.create", "Exam", exam.id, { title: exam.title });
  revalidatePath("/teacher/exams");
  redirect(`/teacher/exams/${exam.id}`);
}

export async function updateExam(examId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  const r = await editableExam(user, examId);
  if ("error" in r) return fail(r.error!);
  const parsed = parseSettings(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  if (!(await lessonBelongs(parsed.data.lessonId, r.exam.courseId))) return fail("الدرس المختار لا يتبع هذه الدورة", { lessonId: "درس غير صالح" });
  await db.exam.update({ where: { id: examId }, data: parsed.data });
  await audit(user, "exam.update", "Exam", examId);
  revalidatePath(`/teacher/exams/${examId}`);
  revalidatePath("/teacher/exams");
  return done("تم حفظ إعدادات الامتحان");
}

export async function toggleExamActive(examId: string): Promise<ActionState> {
  const user = await requireTeacher();
  const r = await editableExam(user, examId);
  if ("error" in r) return fail(r.error!);
  if (!r.exam.isActive && (await db.question.count({ where: { examId } })) === 0) return fail("أضف سؤالاً واحداً على الأقل قبل التفعيل");
  await db.exam.update({ where: { id: examId }, data: { isActive: !r.exam.isActive } });
  await audit(user, r.exam.isActive ? "exam.deactivate" : "exam.activate", "Exam", examId);
  revalidatePath(`/teacher/exams/${examId}`);
  revalidatePath("/teacher/exams");
  return done(r.exam.isActive ? "تم إيقاف الامتحان" : "تم تفعيل الامتحان");
}

export async function deleteExam(examId: string): Promise<ActionState> {
  const user = await requireTeacher();
  const r = await editableExam(user, examId);
  if ("error" in r) return fail(r.error!);
  await db.exam.delete({ where: { id: examId } });
  await audit(user, "exam.delete", "Exam", examId, { title: r.exam.title });
  revalidatePath("/teacher/exams");
  redirect("/teacher/exams");
}

const TYPES: QuestionType[] = ["SINGLE", "MULTIPLE", "TRUE_FALSE"];

export async function saveQuestion(examId: string, questionId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  const r = await editableExam(user, examId);
  if ("error" in r) return fail(r.error!);

  const text = str(form, "text");
  if (text.length < 2) return fail("نص السؤال مطلوب", { text: "اكتب نص السؤال" });
  if (text.length > 2000) return fail("نص السؤال طويل جداً", { text: "الحد الأقصى 2000 حرف" });
  const type = str(form, "type") as QuestionType;
  if (!TYPES.includes(type)) return fail("نوع السؤال غير صالح", { type: "اختر النوع" });
  const points = int(form, "points") ?? 1;
  if (points < 1 || points > 100) return fail("النقاط بين 1 و100", { points: "بين 1 و100" });

  const texts = form.getAll("optionText").map((v) => (typeof v === "string" ? v.trim() : ""));
  const correct = new Set(form.getAll("correct").map(String));
  let options = texts.map((t, i) => ({ text: t, isCorrect: correct.has(String(i)) })).filter((o) => o.text !== "");
  if (type === "TRUE_FALSE") {
    const trueCorrect = options[0]?.isCorrect ?? correct.has("0");
    options = [
      { text: "صح", isCorrect: trueCorrect },
      { text: "خطأ", isCorrect: !trueCorrect && (options[1]?.isCorrect ?? correct.has("1")) },
    ];
  }
  if (options.some((o) => o.text.length > 500)) return fail("نص الخيار طويل جداً (500 حرف كحد أقصى)");
  const err = validateQuestion(type, options);
  if (err) return fail(err);

  // Image: upload, URL, keep, or remove.
  let imageUrl: string | null | undefined = undefined;
  const file = form.get("image");
  if (hasFile(file)) {
    try {
      imageUrl = (await saveUpload(file, { ownerId: user.id, groupName: "exam-images" })).url;
    } catch (e) {
      if (e instanceof UploadError) return fail(e.message, { image: e.message });
      throw e;
    }
  } else if (bool(form, "removeImage")) {
    imageUrl = null;
  } else {
    const url = optStr(form, "imageUrl");
    if (url) {
      if (!isSafeUrl(url)) return fail("رابط الصورة غير صالح", { imageUrl: "رابط غير صالح" });
      imageUrl = url;
    }
  }

  if (questionId) {
    const q = await db.question.findFirst({ where: { id: questionId, examId } });
    if (!q) return fail("السؤال غير موجود");
    await db.$transaction([
      db.option.deleteMany({ where: { questionId } }),
      db.question.update({
        where: { id: questionId },
        data: {
          text,
          type,
          points,
          ...(imageUrl !== undefined && { imageUrl }),
          options: { create: options.map((o, i) => ({ ...o, sortOrder: i + 1 })) },
        },
      }),
    ]);
    await audit(user, "question.update", "Question", questionId, { examId });
  } else {
    const last = await db.question.aggregate({ where: { examId }, _max: { sortOrder: true } });
    const q = await db.question.create({
      data: {
        examId,
        text,
        type,
        points,
        imageUrl: imageUrl ?? null,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        options: { create: options.map((o, i) => ({ ...o, sortOrder: i + 1 })) },
      },
    });
    await audit(user, "question.create", "Question", q.id, { examId });
  }
  revalidatePath(`/teacher/exams/${examId}`);
  return done(questionId ? "تم تعديل السؤال" : "تمت إضافة السؤال");
}

export async function deleteQuestion(examId: string, questionId: string): Promise<ActionState> {
  const user = await requireTeacher();
  const r = await editableExam(user, examId);
  if ("error" in r) return fail(r.error!);
  const res = await db.question.deleteMany({ where: { id: questionId, examId } });
  if (res.count === 0) return fail("السؤال غير موجود");
  await audit(user, "question.delete", "Question", questionId, { examId });
  revalidatePath(`/teacher/exams/${examId}`);
  return done("تم حذف السؤال");
}

export async function moveQuestion(examId: string, questionId: string, direction: "up" | "down"): Promise<ActionState> {
  const user = await requireTeacher();
  const r = await editableExam(user, examId);
  if ("error" in r) return fail(r.error!);
  const list = await db.question.findMany({ where: { examId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = list.findIndex((q) => q.id === questionId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return done();
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((q, idx) => db.question.update({ where: { id: q.id }, data: { sortOrder: idx + 1 } })));
  revalidatePath(`/teacher/exams/${examId}`);
  return { ok: true };
}
