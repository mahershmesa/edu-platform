"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fail, type ActionState } from "@/lib/action";
import { shuffled } from "@/lib/domain/exams";
import { isEnrolled } from "@/server/access";
import { finalizeAttempt, finalizeExpiredAttempts, isAttemptOpen, type AttemptLayout } from "@/server/exams";

export async function startAttempt(examId: string, _prev: ActionState, _form: FormData): Promise<ActionState> {
  const user = await requireStudent();
  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      course: { select: { id: true, status: true } },
      questions: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, options: { orderBy: { sortOrder: "asc" }, select: { id: true } } } },
    },
  });
  if (!exam || !exam.isActive || exam.course.status !== "PUBLISHED") return fail("هذا الامتحان غير متاح حالياً");
  if (!(await isEnrolled(user.id, exam.courseId))) return fail("يجب أن تكون مشتركاً في الدورة لأداء الامتحان");
  if (exam.questions.length === 0) return fail("لا توجد أسئلة في هذا الامتحان بعد");

  await finalizeExpiredAttempts(exam.id, user.id);
  const open = await db.examAttempt.findFirst({ where: { examId, studentId: user.id, submittedAt: null }, orderBy: { startedAt: "desc" } });
  if (open && isAttemptOpen(open)) redirect(`/exams/${examId}/attempt/${open.id}`);

  const used = await db.examAttempt.count({ where: { examId, studentId: user.id } });
  if (exam.maxAttempts !== null && used >= exam.maxAttempts) return fail("استنفدت كل المحاولات المسموحة لهذا الامتحان");

  let layout: AttemptLayout = {};
  if (exam.shuffle) {
    layout = {
      questions: shuffled(exam.questions.map((q) => q.id)),
      options: Object.fromEntries(exam.questions.map((q) => [q.id, shuffled(q.options.map((o) => o.id))])),
    };
  }
  const attempt = await db.examAttempt.create({
    data: {
      examId,
      studentId: user.id,
      deadline: new Date(Date.now() + exam.durationMin * 60 * 1000),
      layout,
      answers: {},
    },
  });
  redirect(`/exams/${examId}/attempt/${attempt.id}`);
}

async function ownAttempt(attemptId: string) {
  const user = await requireStudent();
  const attempt = await db.examAttempt.findFirst({ where: { id: attemptId, studentId: user.id } });
  return attempt;
}

/** Autosave. Keeps only valid question/option ids; ignores closed attempts. */
export async function saveAnswers(attemptId: string, answers: Record<string, string[]>): Promise<{ ok: boolean; closed?: boolean }> {
  const attempt = await ownAttempt(attemptId);
  if (!attempt) return { ok: false };
  if (!isAttemptOpen(attempt)) return { ok: false, closed: true };
  const questions = await db.question.findMany({ where: { examId: attempt.examId }, select: { id: true, type: true, options: { select: { id: true } } } });
  const clean: Record<string, string[]> = {};
  for (const q of questions) {
    const raw = answers?.[q.id];
    if (!Array.isArray(raw)) continue;
    const valid = new Set(q.options.map((o) => o.id));
    let picked = [...new Set(raw.filter((x) => typeof x === "string" && valid.has(x)))];
    if (q.type !== "MULTIPLE") picked = picked.slice(0, 1);
    if (picked.length) clean[q.id] = picked;
  }
  await db.examAttempt.updateMany({ where: { id: attemptId, submittedAt: null }, data: { answers: clean } });
  return { ok: true };
}

export async function submitAttempt(attemptId: string, answers?: Record<string, string[]>) {
  const attempt = await ownAttempt(attemptId);
  if (!attempt) redirect("/my-courses");
  if (answers && isAttemptOpen(attempt)) await saveAnswers(attemptId, answers);
  await finalizeAttempt(attemptId);
  redirect(`/exams/${attempt.examId}/attempt/${attemptId}/result`);
}
