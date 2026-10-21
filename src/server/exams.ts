import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { gradeExam, type Answers } from "@/lib/domain/exams";

export type AttemptLayout = { questions?: string[]; options?: Record<string, string[]> };

/** Exam owned by the teacher (or null). */
export async function getOwnedExam(teacherId: string, examId: string) {
  return db.exam.findFirst({ where: { id: examId, course: { teacherId } }, include: { course: true } });
}

export function parseAnswers(value: Prisma.JsonValue): Answers {
  const out: Answers = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
    }
  }
  return out;
}

export function parseLayout(value: Prisma.JsonValue): AttemptLayout {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as AttemptLayout;
  return {};
}

/** Attempt is open when not submitted and the deadline (plus a small grace) hasn't passed. */
export function isAttemptOpen(a: { submittedAt: Date | null; deadline: Date }, now = new Date()) {
  return !a.submittedAt && a.deadline.getTime() + 15_000 > now.getTime();
}

/** Grade and close an attempt on the server using its saved answers. Idempotent. */
export async function finalizeAttempt(attemptId: string) {
  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: { questions: { include: { options: true } } } } },
  });
  if (!attempt) return null;
  if (attempt.submittedAt) return attempt;
  const answers = parseAnswers(attempt.answers);
  const result = gradeExam(
    attempt.exam.questions.map((q) => ({ id: q.id, points: q.points, options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect })) })),
    answers,
    attempt.exam.passPercent,
  );
  const now = new Date();
  // Only close attempts that are still open in the DB (avoid double grading races).
  await db.examAttempt.updateMany({
    where: { id: attemptId, submittedAt: null },
    data: {
      submittedAt: now < attempt.deadline ? now : attempt.deadline,
      score: result.score,
      maxScore: result.maxScore,
      passed: result.passed,
    },
  });
  return db.examAttempt.findUnique({ where: { id: attemptId } });
}

/** Grade any expired unfinished attempts of the student for the exam. */
export async function finalizeExpiredAttempts(examId: string, studentId: string) {
  const expired = await db.examAttempt.findMany({
    where: { examId, studentId, submittedAt: null, deadline: { lt: new Date(Date.now() - 15_000) } },
    select: { id: true },
  });
  for (const a of expired) await finalizeAttempt(a.id);
}
