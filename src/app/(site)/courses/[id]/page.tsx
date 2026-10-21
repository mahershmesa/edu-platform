import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, ClipboardList, Clock, Lock, PlayCircle, Unlock } from "lucide-react";
import { cache } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDuration, formatIQD, formatNumber } from "@/lib/format";
import { resumeLesson } from "@/server/catalog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { CourseImage } from "@/components/site/course-card";
import { RedeemForm } from "@/components/site/redeem-form";
import { ContactLinks } from "@/components/site/contact-links";

const load = cache(async (id: string) =>
  db.course.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      teacher: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
      lessons: {
        where: { isPublished: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, durationMin: true, isFree: true },
      },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await load((await params).id);
  if (!c) return { title: "الدورة غير موجودة" };
  return {
    title: c.title,
    description: c.description?.slice(0, 160) ?? `${c.title} مع ${c.teacher.name}`,
    openGraph: { title: c.title, images: c.imageUrl ? [c.imageUrl] : undefined },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await load(id);
  if (!course) notFound();
  const user = await getCurrentUser();

  const enrollment =
    user?.type === "STUDENT"
      ? await db.enrollment.findUnique({ where: { studentId_courseId: { studentId: user.id, courseId: course.id } } })
      : null;
  const enrolled = enrollment?.status === "ACTIVE";
  const revoked = enrollment?.status === "REVOKED";
  const ownerOrStaff = !!user && (user.type === "ADMIN" || user.type === "STAFF" || (user.type === "TEACHER" && user.id === course.teacherId));
  const fullAccess = enrolled || ownerOrStaff;

  const [completedIds, resume, exams] = await Promise.all([
    enrolled
      ? db.lessonProgress
          .findMany({ where: { studentId: user!.id, lesson: { courseId: course.id }, completedAt: { not: null } }, select: { lessonId: true } })
          .then((r) => new Set(r.map((x) => x.lessonId)))
      : Promise.resolve(new Set<string>()),
    enrolled ? resumeLesson(user!.id, course.id) : Promise.resolve(null),
    fullAccess
      ? db.exam.findMany({
          where: { courseId: course.id, isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true, durationMin: true, _count: { select: { questions: true } } },
        })
      : Promise.resolve([]),
  ]);

  const totalMin = course.lessons.reduce((n, l) => n + (l.durationMin ?? 0), 0);
  const freeLessons = course.lessons.filter((l) => l.isFree);
  const progressPct = resume && resume.total > 0 ? Math.round((resume.completed / resume.total) * 100) : 0;
  const loginHref = `/login?next=${encodeURIComponent(`/courses/${course.id}`)}`;

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-brand-50 to-surface">
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6">
          <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="المسار">
            <Link href="/courses" className="hover:text-brand-700">الدورات</Link>
            <ChevronLeft className="h-4 w-4" />
            {course.category.parent && (
              <>
                <Link href={`/categories/${course.category.parent.id}`} className="hover:text-brand-700">
                  {course.category.parent.name}
                </Link>
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
            <Link href={`/categories/${course.category.id}`} className="hover:text-brand-700">
              {course.category.name}
            </Link>
          </nav>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
            <div>
              <h1 className="text-2xl leading-snug font-extrabold sm:text-4xl">{course.title}</h1>
              {course.description && <p className="mt-3 max-w-3xl leading-8 whitespace-pre-line text-muted">{course.description}</p>}
              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold ring-1 ring-line">
                  <PlayCircle className="h-4 w-4 text-brand-600" /> {formatNumber(course.lessons.length)} درس
                </span>
                {totalMin > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold ring-1 ring-line">
                    <Clock className="h-4 w-4 text-brand-600" /> {formatDuration(totalMin)}
                  </span>
                )}
                {freeLessons.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold ring-1 ring-line">
                    <Unlock className="h-4 w-4 text-brand-600" /> {formatNumber(freeLessons.length)} درس مجاني
                  </span>
                )}
              </div>
              <Link href={`/teachers/${course.teacher.id}`} className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white p-3 pl-5 ring-1 ring-line hover:ring-brand-200">
                <Avatar name={course.teacher.name} src={course.teacher.avatarUrl} size={48} />
                <span>
                  <span className="block text-xs text-muted">المعلم</span>
                  <span className="font-bold">{course.teacher.name}</span>
                </span>
              </Link>
            </div>

            {/* Purchase / access card */}
            <aside className="card overflow-hidden lg:sticky lg:top-20">
              <div className="aspect-[4/3] bg-surface">
                <CourseImage src={course.imageUrl} title={course.title} />
              </div>
              <div className="space-y-4 p-5">
                {enrolled ? (
                  <>
                    <Badge tone="green">
                      <CheckCircle2 className="h-3.5 w-3.5" /> أنت مشترك في هذه الدورة
                    </Badge>
                    <div>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-muted">تقدّمك</span>
                        <span className="font-bold">{formatNumber(progressPct)}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${progressPct}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        أنهيت {formatNumber(resume?.completed ?? 0)} من {formatNumber(resume?.total ?? 0)} درس
                      </p>
                    </div>
                    {resume?.lessonId && (
                      <Link href={`/learn/${course.id}/${resume.lessonId}`} className={buttonClass("primary", "lg", "w-full")}>
                        <PlayCircle className="h-5 w-5" /> {resume.completed > 0 ? "أكمل التعلم" : "ابدأ التعلم"}
                      </Link>
                    )}
                  </>
                ) : ownerOrStaff ? (
                  <>
                    <p className="text-sm text-muted">تشاهد هذه الدورة بصفتك {user!.type === "TEACHER" ? "معلمها" : "من الإدارة"}.</p>
                    {course.lessons[0] && (
                      <Link href={`/learn/${course.id}/${course.lessons[0].id}`} className={buttonClass("primary", "lg", "w-full")}>
                        <PlayCircle className="h-5 w-5" /> معاينة الدروس
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">السعر</span>
                      <span className="text-2xl font-extrabold text-brand-700">{formatIQD(course.price)}</span>
                    </div>
                    {revoked ? (
                      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">اشتراكك في هذه الدورة ملغى. تواصل مع الدعم.</p>
                    ) : user?.type === "STUDENT" ? (
                      <RedeemForm courseId={course.id} compact />
                    ) : user ? (
                      <p className="rounded-xl bg-surface p-3 text-sm text-muted">تفعيل الأكواد متاح لحسابات الطلاب فقط.</p>
                    ) : (
                      <div className="space-y-2">
                        <Link href={loginHref} className={buttonClass("primary", "lg", "w-full")}>
                          سجّل الدخول لتفعيل الكود
                        </Link>
                        <Link href={`/register?next=${encodeURIComponent(`/courses/${course.id}`)}`} className={buttonClass("secondary", "md", "w-full")}>
                          ليس لديك حساب؟ أنشئ حساباً مجانياً
                        </Link>
                      </div>
                    )}
                    {freeLessons[0] && (
                      <Link href={`/learn/${course.id}/${freeLessons[0].id}`} className={buttonClass("secondary", "md", "w-full")}>
                        <PlayCircle className="h-4 w-4" /> شاهد درساً مجانياً
                      </Link>
                    )}
                    <details className="rounded-xl bg-surface p-3 text-sm">
                      <summary className="cursor-pointer font-semibold">كيف أحصل على الكود؟</summary>
                      <p className="mt-2 leading-7 text-muted">
                        اشترِ كود الدورة من معلمك {course.teacher.name} أو من المكتبات المعتمدة، ثم أدخله هنا لتُفتح لك كل الدروس.
                      </p>
                      <div className="mt-3">
                        <ContactLinks />
                      </div>
                    </details>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold">محتوى الدورة</h2>
              <span className="text-sm text-muted">{formatNumber(course.lessons.length)} درس</span>
            </div>
            {course.lessons.length === 0 ? (
              <p className="p-5 text-sm text-muted">لم تُضف دروس بعد.</p>
            ) : (
              <ol className="divide-y divide-line">
                {course.lessons.map((l, i) => {
                  const open = fullAccess || l.isFree;
                  const done = completedIds.has(l.id);
                  const inner = (
                    <>
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                          done ? "bg-brand-600 text-white" : open ? "bg-brand-50 text-brand-700" : "bg-surface text-muted"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-5 w-5" /> : formatNumber(i + 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{l.title}</span>
                        <span className="text-xs text-muted">{formatDuration(l.durationMin)}</span>
                      </span>
                      {l.isFree && !fullAccess && <Badge tone="green">مجاني</Badge>}
                      {open ? <PlayCircle className="h-5 w-5 shrink-0 text-brand-600" /> : <Lock className="h-4 w-4 shrink-0 text-muted" aria-label="مقفل" />}
                    </>
                  );
                  return (
                    <li key={l.id}>
                      {open ? (
                        <Link href={`/learn/${course.id}/${l.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-50/40">
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-3.5 opacity-80">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {fullAccess && exams.length > 0 && (
            <section className="card">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-lg font-bold">الامتحانات</h2>
              </div>
              <ul className="divide-y divide-line">
                {exams.map((e) => (
                  <li key={e.id}>
                    <Link href={`/exams/${e.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-50/40">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 text-amber-700">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold">{e.title}</span>
                        <span className="text-xs text-muted">
                          {formatNumber(e._count.questions)} سؤال · {formatNumber(e.durationMin)} دقيقة
                        </span>
                      </span>
                      <ChevronLeft className="h-4 w-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {course.teacher.bio && (
          <section className="card h-fit p-5">
            <h2 className="font-bold">عن المعلم</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={course.teacher.name} src={course.teacher.avatarUrl} size={44} />
              <p className="font-semibold">{course.teacher.name}</p>
            </div>
            <p className="mt-3 text-sm leading-7 whitespace-pre-line text-muted">{course.teacher.bio}</p>
            <Link href={`/teachers/${course.teacher.id}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
              كل دورات المعلم ←
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
