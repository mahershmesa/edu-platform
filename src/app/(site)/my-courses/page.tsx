import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, PlayCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CourseImage } from "@/components/site/course-card";

export const metadata: Metadata = { title: "دوراتي" };

export default async function MyCoursesPage() {
  const user = await requireStudent();
  const enrollments = await db.enrollment.findMany({
    where: { studentId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          status: true,
          teacher: { select: { name: true } },
          lessons: {
            where: { isPublished: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, progress: { where: { studentId: user.id, completedAt: { not: null } }, select: { lessonId: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">دوراتي</h1>
          <p className="mt-1 text-sm text-muted">أهلاً {user.name}، تابع من حيث توقفت</p>
        </div>
        <Link href="/redeem" className={buttonClass("primary", "md")}>
          <KeyRound className="h-4 w-4" /> تفعيل كود جديد
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            icon={<KeyRound className="h-7 w-7" />}
            title="لم تشترك في أي دورة بعد"
            description="فعّل كود الدورة الذي حصلت عليه من معلمك لتظهر هنا"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/redeem" className={buttonClass("primary", "md")}>
                  تفعيل كود
                </Link>
                <Link href="/courses" className={buttonClass("secondary", "md")}>
                  تصفّح الدورات
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map(({ course }) => {
            const total = course.lessons.length;
            const done = course.lessons.filter((l) => l.progress.length > 0).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const next = course.lessons.find((l) => l.progress.length === 0) ?? course.lessons[0];
            const available = course.status === "PUBLISHED";
            return (
              <div key={course.id} className="card flex flex-col overflow-hidden">
                <Link href={`/courses/${course.id}`} className="aspect-[16/9] bg-surface">
                  <CourseImage src={course.imageUrl} title={course.title} />
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/courses/${course.id}`} className="line-clamp-2 font-bold hover:text-brand-700">
                    {course.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{course.teacher.name}</p>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted">
                        {formatNumber(done)} من {formatNumber(total)} درس
                      </span>
                      <span className="font-bold">{formatNumber(pct)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="min-h-4 flex-1" />
                  {!available ? (
                    <p className="rounded-xl bg-surface p-3 text-center text-sm text-muted">الدورة غير متاحة مؤقتاً</p>
                  ) : next ? (
                    <Link href={`/learn/${course.id}/${next.id}`} className={buttonClass(pct === 100 ? "secondary" : "primary", "md", "w-full")}>
                      <PlayCircle className="h-4 w-4" />
                      {pct === 100 ? "مراجعة الدروس" : done > 0 ? "أكمل من حيث توقفت" : "ابدأ التعلم"}
                    </Link>
                  ) : (
                    <p className="rounded-xl bg-surface p-3 text-center text-sm text-muted">لم تُضف دروس بعد</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
