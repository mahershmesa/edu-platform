import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { finalizeAttempt, isAttemptOpen, parseAnswers, parseLayout } from "@/server/exams";
import { AttemptClient, type AttemptQuestion } from "./attempt-client";

export const metadata: Metadata = { title: "أداء الامتحان" };

export default async function AttemptPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const user = await requireStudent();
  const { id, attemptId } = await params;
  const attempt = await db.examAttempt.findFirst({
    where: { id: attemptId, examId: id, studentId: user.id },
    include: {
      exam: {
        include: {
          questions: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            // isCorrect is intentionally NOT selected: nothing about correctness reaches the browser.
            select: { id: true, text: true, imageUrl: true, type: true, points: true, options: { orderBy: { sortOrder: "asc" }, select: { id: true, text: true } } },
          },
        },
      },
    },
  });
  if (!attempt) notFound();
  if (!isAttemptOpen(attempt)) {
    await finalizeAttempt(attempt.id);
    redirect(`/exams/${id}/attempt/${attempt.id}/result`);
  }

  const layout = parseLayout(attempt.layout);
  const byId = new Map(attempt.exam.questions.map((q) => [q.id, q]));
  const orderedIds = layout.questions?.length
    ? [...layout.questions.filter((qid) => byId.has(qid)), ...attempt.exam.questions.map((q) => q.id).filter((qid) => !layout.questions!.includes(qid))]
    : attempt.exam.questions.map((q) => q.id);

  const questions: AttemptQuestion[] = orderedIds.map((qid) => {
    const q = byId.get(qid)!;
    const order = layout.options?.[qid];
    const options = order?.length
      ? [...q.options].sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999))
      : q.options;
    return { id: q.id, text: q.text, imageUrl: q.imageUrl, type: q.type, points: q.points, options };
  });

  return (
    <AttemptClient
      attemptId={attempt.id}
      examTitle={attempt.exam.title}
      questions={questions}
      initialAnswers={parseAnswers(attempt.answers)}
      deadline={attempt.deadline.toISOString()}
      serverNow={new Date().toISOString()}
    />
  );
}
