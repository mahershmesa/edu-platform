/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, RotateCcw, Trophy, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { formatDateTime, formatNumber } from "@/lib/format";
import { gradeExam } from "@/lib/domain/exams";
import { finalizeAttempt, isAttemptOpen, parseAnswers, parseLayout } from "@/server/exams";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "نتيجة الامتحان" };

export default async function AttemptResultPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const user = await requireStudent();
  const { id, attemptId } = await params;
  let attempt = await db.examAttempt.findFirst({ where: { id: attemptId, examId: id, studentId: user.id } });
  if (!attempt) notFound();
  if (!attempt.submittedAt) {
    if (isAttemptOpen(attempt)) redirect(`/exams/${id}/attempt/${attempt.id}`);
    attempt = (await finalizeAttempt(attempt.id))!;
  }

  const exam = await db.exam.findUniqueOrThrow({
    where: { id },
    include: {
      course: { select: { id: true, title: true } },
      questions: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { options: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  const answers = parseAnswers(attempt.answers);
  const layout = parseLayout(attempt.layout);
  const percent = attempt.maxScore ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100) : 0;
  const used = await db.examAttempt.count({ where: { examId: id, studentId: user.id } });
  const canRetry = exam.isActive && (exam.maxAttempts === null || used < exam.maxAttempts);

  // Per-question correctness against the current questions (for the review list).
  const review = gradeExam(
    exam.questions.map((q) => ({ id: q.id, points: q.points, options: q.options })),
    answers,
    exam.passPercent,
  ).perQuestion;
  const order = layout.questions?.length ? layout.questions : exam.questions.map((q) => q.id);
  const questions = [...exam.questions].sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href={`/exams/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowRight className="h-4 w-4" /> {exam.title}
      </Link>

      <div className="card overflow-hidden text-center">
        <div className={cn("p-8 text-white", attempt.passed ? "bg-gradient-to-l from-brand-700 to-brand-500" : "bg-gradient-to-l from-red-700 to-red-500")}>
          {attempt.passed ? <Trophy className="mx-auto h-14 w-14" /> : <XCircle className="mx-auto h-14 w-14" />}
          <p className="mt-3 text-2xl font-extrabold">{attempt.passed ? "مبروك، لقد نجحت!" : "لم تحقق درجة النجاح هذه المرة"}</p>
          <p className="mt-4 text-5xl font-extrabold tabular-nums">{formatNumber(percent)}%</p>
          <p className="mt-2 text-white/85">
            {formatNumber(attempt.score ?? 0)} من {formatNumber(attempt.maxScore ?? 0)} نقطة · درجة النجاح {formatNumber(exam.passPercent)}%
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 p-5 text-sm text-muted">
          <span>سُلّم في {formatDateTime(attempt.submittedAt)}</span>
          {canRetry && (
            <Link href={`/exams/${id}`} className={buttonClass("secondary", "sm")}>
              <RotateCcw className="h-4 w-4" /> محاولة جديدة
            </Link>
          )}
          <Link href={`/courses/${exam.course.id}`} className={buttonClass("primary", "sm")}>
            العودة إلى الدورة
          </Link>
        </div>
      </div>

      {exam.showAnswers ? (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-bold">مراجعة الإجابات</h2>
          {questions.map((q, i) => {
            const chosen = new Set(answers[q.id] ?? []);
            const ok = review[q.id];
            return (
              <div key={q.id} className="card p-5">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    السؤال {formatNumber(i + 1)} · {formatNumber(q.points)} نقطة
                  </span>
                  <Badge tone={ok ? "green" : chosen.size ? "red" : "gray"}>{ok ? "إجابة صحيحة" : chosen.size ? "إجابة خاطئة" : "لم تُجب"}</Badge>
                </div>
                <p className="leading-8 font-bold whitespace-pre-line">{q.text}</p>
                {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-2 max-h-60 rounded-xl border border-line" />}
                <ul className="mt-3 space-y-2">
                  {q.options.map((o) => {
                    const picked = chosen.has(o.id);
                    return (
                      <li
                        key={o.id}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm",
                          o.isCorrect ? "border-brand-300 bg-brand-50 text-brand-900" : picked ? "border-red-200 bg-red-50 text-red-800" : "border-line",
                        )}
                      >
                        {o.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                        ) : picked ? (
                          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted" />
                        )}
                        <span className="flex-1">{o.text}</span>
                        {picked && <span className="text-xs font-semibold">إجابتك</span>}
                        {o.isCorrect && !picked && <span className="text-xs font-semibold">الإجابة الصحيحة</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-surface p-4 text-center text-sm text-muted">لا يعرض المعلم الإجابات الصحيحة لهذا الامتحان.</p>
      )}
    </div>
  );
}
