import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Lock, PlayCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canWatchLesson } from "@/server/access";
import { formatDuration, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ProtectedPlayer } from "@/components/site/protected-player";
import { CompleteButton } from "@/components/site/complete-button";

type Params = { courseId: string; lessonId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lessonId } = await params;
  const l = await db.lesson.findUnique({ where: { id: lessonId }, select: { title: true, course: { select: { title: true } } } });
  return { title: l ? `${l.title} · ${l.course.title}` : "الدرس", robots: { index: false } };
}

export default async function LearnPage({ params }: { params: Promise<Params> }) {
  const { courseId, lessonId } = await params;
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, courseId },
    include: {
      course: { select: { id: true, title: true, teacherId: true, status: true } },
      attachment: { select: { storedName: true, originalName: true } },
    },
  });
  if (!lesson) notFound();
  const user = await getCurrentUser();
  if (!(await canWatchLesson(user, lesson))) {
    if (!user && !lesson.isFree) redirect(`/login?next=${encodeURIComponent(`/learn/${courseId}/${lessonId}`)}`);
    redirect(`/courses/${courseId}`);
  }

  const staffView = !!user && (user.type === "ADMIN" || user.type === "STAFF" || user.type === "TEACHER");
  const isStudent = user?.type === "STUDENT";
  const enrolled =
    isStudent &&
    (await db.enrollment.findUnique({ where: { studentId_courseId: { studentId: user.id, courseId } } }))?.status === "ACTIVE";
  const fullAccess = enrolled || staffView;

  const lessons = await db.lesson.findMany({
    where: { courseId, ...(staffView ? {} : { isPublished: true }) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      durationMin: true,
      isFree: true,
      progress: isStudent ? { where: { studentId: user.id, completedAt: { not: null } }, select: { lessonId: true } } : false,
    },
  });
  const accessible = lessons.filter((l) => fullAccess || l.isFree);
  const idx = accessible.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? accessible[idx - 1] : null;
  const next = idx >= 0 && idx < accessible.length - 1 ? accessible[idx + 1] : null;
  const doneSet = new Set(lessons.filter((l) => (l.progress?.length ?? 0) > 0).map((l) => l.id));
  const completedCount = doneSet.size;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const watermark = user ? `${user.name} · ${user.phone ? displayPhone(user.phone) : (user.email ?? "")}` : "أساس أكاديمي";

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="المسار">
        <Link href={`/courses/${courseId}`} className="font-semibold hover:text-brand-700">
          {lesson.course.title}
        </Link>
        <ChevronLeft className="h-4 w-4" />
        <span className="truncate text-ink">{lesson.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <ProtectedPlayer videoId={lesson.youtubeId} watermark={watermark} />
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold sm:text-2xl">{lesson.title}</h1>
              <p className="mt-1 text-sm text-muted">{formatDuration(lesson.durationMin)}</p>
            </div>
            {enrolled && <CompleteButton lessonId={lesson.id} completed={doneSet.has(lesson.id)} nextHref={next ? `/learn/${courseId}/${next.id}` : null} />}
          </div>
          {!user && lesson.isFree && (
            <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
              هذا درس مجاني للتجربة.{" "}
              <Link href={`/register?next=${encodeURIComponent(`/courses/${courseId}`)}`} className="font-bold underline">
                أنشئ حساباً
              </Link>{" "}
              وفعّل كود الدورة لمشاهدة كل الدروس.
            </div>
          )}
          {lesson.description && (
            <div className="card mt-5 p-5">
              <h2 className="font-bold">عن الدرس</h2>
              <p className="mt-2 leading-8 whitespace-pre-line text-muted">{lesson.description}</p>
            </div>
          )}
          {lesson.attachment && fullAccess && (
            <a
              href={`/files/${lesson.attachment.storedName}`}
              target="_blank"
              rel="noopener"
              className="card mt-4 flex items-center gap-3 p-4 hover:bg-brand-50/40"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Download className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">ملف مرفق</span>
                <span className="block truncate text-xs text-muted">{lesson.attachment.originalName}</span>
              </span>
            </a>
          )}
          <div className="mt-6 flex justify-between gap-3">
            {prev ? (
              <Link href={`/learn/${courseId}/${prev.id}`} className={buttonClass("secondary", "md")}>
                <ChevronRight className="h-4 w-4" /> السابق
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/learn/${courseId}/${next.id}`} className={buttonClass("secondary", "md")}>
                التالي <ChevronLeft className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        <aside className="card h-fit overflow-hidden lg:sticky lg:top-20">
          <div className="border-b border-line p-4">
            <p className="font-bold">دروس الدورة</p>
            {enrolled && (
              <>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatNumber(completedCount)} من {formatNumber(lessons.length)} · {formatNumber(pct)}%
                </p>
              </>
            )}
          </div>
          <ol className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {lessons.map((l, i) => {
              const open = fullAccess || l.isFree;
              const current = l.id === lesson.id;
              const done = doneSet.has(l.id);
              const content = (
                <>
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                      done ? "bg-brand-600 text-white" : current ? "bg-brand-100 text-brand-700" : "bg-surface text-muted",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : formatNumber(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", current ? "font-bold text-brand-700" : "font-medium")}>{l.title}</span>
                    <span className="text-xs text-muted">{formatDuration(l.durationMin)}</span>
                  </span>
                  {current ? (
                    <PlayCircle className="h-4 w-4 shrink-0 text-brand-600" />
                  ) : !open ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-muted" />
                  ) : null}
                </>
              );
              return (
                <li key={l.id}>
                  {open ? (
                    <Link
                      href={`/learn/${courseId}/${l.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn("flex items-center gap-3 px-4 py-3 hover:bg-brand-50/40", current && "bg-brand-50/60")}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 opacity-70">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
