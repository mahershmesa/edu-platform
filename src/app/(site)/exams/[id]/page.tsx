import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardList, Clock, FileQuestion, Repeat, Target, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { formatDateTime, formatNumber } from "@/lib/format";
import { isEnrolled } from "@/server/access";
import { finalizeExpiredAttempts, isAttemptOpen } from "@/server/exams";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { buttonClass } from "@/components/ui/button";
import { startAttempt } from "./actions";

export const metadata: Metadata = { title: "الامتحان" };

export default async function ExamIntroPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: { course: { select: { id: true, title: true, status: true } }, lesson: { select: { title: true } }, _count: { select: { questions: true } } },
  });
  if (!exam || exam.course.status !== "PUBLISHED") notFound();
  const enrolled = await isEnrolled(user.id, exam.courseId);

  if (enrolled) await finalizeExpiredAttempts(exam.id, user.id);
  const attempts = enrolled
    ? await db.examAttempt.findMany({ where: { examId: exam.id, studentId: user.id }, orderBy: { startedAt: "desc" } })
    : [];
  const open = attempts.find((a) => isAttemptOpen(a));
  const used = attempts.length;
  const remaining = exam.maxAttempts === null ? null : Math.max(0, exam.maxAttempts - used);
  const best = attempts.filter((a) => a.submittedAt && a.maxScore).reduce<number | null>((m, a) => {
    const p = Math.round(((a.score ?? 0) / a.maxScore!) * 100);
    return m === null || p > m ? p : m;
  }, null);

  const blocked = !enrolled
    ? "يجب أن تكون مشتركاً في الدورة لأداء هذا الامتحان."
    : !exam.isActive
      ? "هذا الامتحان غير متاح حالياً."
      : exam._count.questions === 0
        ? "لا توجد أسئلة في هذا الامتحان بعد."
        : !open && remaining === 0
          ? "استنفدت كل المحاولات المسموحة لهذا الامتحان."
          : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href={`/courses/${exam.course.id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowRight className="h-4 w-4" /> {exam.course.title}
      </Link>
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-l from-brand-700 to-brand-500 p-6 text-white sm:p-8">
          <ClipboardList className="h-10 w-10 opacity-90" />
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{exam.title}</h1>
          {exam.lesson && <p className="mt-1 text-sm text-white/80">مرتبط بدرس: {exam.lesson.title}</p>}
        </div>
        <div className="space-y-6 p-6 sm:p-8">
          {exam.description && <p className="leading-8 whitespace-pre-line text-muted">{exam.description}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info icon={<Clock className="h-5 w-5" />} label="المدة" value={`${formatNumber(exam.durationMin)} دقيقة`} />
            <Info icon={<FileQuestion className="h-5 w-5" />} label="الأسئلة" value={formatNumber(exam._count.questions)} />
            <Info icon={<Target className="h-5 w-5" />} label="درجة النجاح" value={`${formatNumber(exam.passPercent)}%`} />
            <Info
              icon={<Repeat className="h-5 w-5" />}
              label="المحاولات"
              value={exam.maxAttempts === null ? `${formatNumber(used)} / بلا حد` : `${formatNumber(used)} / ${formatNumber(exam.maxAttempts)}`}
            />
          </div>
          {best !== null && (
            <p className="text-sm text-muted">
              أفضل نتيجة لك: <b className="text-ink">{formatNumber(best)}%</b>
            </p>
          )}

          {blocked ? (
            <Alert tone="warning">{blocked}</Alert>
          ) : open ? (
            <Link href={`/exams/${exam.id}/attempt/${open.id}`} className={buttonClass("primary", "lg", "w-full")}>
              متابعة المحاولة الحالية
            </Link>
          ) : (
            <ActionForm action={startAttempt.bind(null, exam.id)} showSuccessToast={false}>
              <ul className="mb-4 list-disc space-y-1 pr-5 text-sm text-muted">
                <li>يبدأ العدّاد فور الضغط على زر البدء ولا يتوقف إن أغلقت الصفحة.</li>
                <li>تُحفظ إجاباتك تلقائياً، ويُسلَّم الامتحان تلقائياً عند انتهاء الوقت.</li>
              </ul>
              <SubmitButton className="h-12 w-full text-base" pendingText="جارٍ التحضير...">
                ابدأ الامتحان
              </SubmitButton>
            </ActionForm>
          )}

          {attempts.some((a) => a.submittedAt) && (
            <div>
              <h2 className="mb-3 font-bold">محاولاتك السابقة</h2>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {attempts
                  .filter((a) => a.submittedAt)
                  .map((a, i, arr) => {
                    const p = a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0;
                    return (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {a.passed ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : <XCircle className="h-5 w-5 text-red-500" />}
                          <span className="font-semibold">المحاولة {formatNumber(arr.length - i)}</span>
                          <span className="text-muted">{formatDateTime(a.submittedAt)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold tabular-nums">
                            {formatNumber(a.score ?? 0)} / {formatNumber(a.maxScore ?? 0)} ({formatNumber(p)}%)
                          </span>
                          <Badge tone={a.passed ? "green" : "red"}>{a.passed ? "ناجح" : "راسب"}</Badge>
                          <Link href={`/exams/${exam.id}/attempt/${a.id}/result`} className="font-semibold text-brand-700 hover:underline">
                            التفاصيل
                          </Link>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface/60 p-3 text-center">
      <span className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>
      <p className="mt-2 text-xs text-muted">{label}</p>
      <p className="font-bold tabular-nums">{value}</p>
    </div>
  );
}
