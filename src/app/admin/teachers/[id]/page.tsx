import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Eye, LogIn, TrendingUp, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatDate, formatIQD, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { impersonateTeacher } from "../actions";

export const metadata: Metadata = { title: "ملخص المعلم" };

const STATUS = {
  DRAFT: { label: "مسودة", tone: "gray" },
  PUBLISHED: { label: "منشورة", tone: "green" },
  HIDDEN: { label: "مخفية", tone: "amber" },
} as const;

export default async function TeacherSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("teachers.read");
  const { id } = await params;
  const teacher = await db.user.findFirst({
    where: { id, type: "TEACHER" },
    include: {
      courses: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              lessons: true,
              exams: true,
              enrollments: { where: { status: "ACTIVE" } },
            },
          },
        },
      },
    },
  });
  if (!teacher) notFound();

  const courseIds = teacher.courses.map((c) => c.id);
  const [students, publishedLessonsByCourse, completedByCourse, paid] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId: { in: courseIds }, status: "ACTIVE" },
      distinct: ["studentId"],
      select: { studentId: true },
    }),
    db.lesson.groupBy({ by: ["courseId"], where: { courseId: { in: courseIds }, isPublished: true }, _count: true }),
    // completed lesson progress rows belonging to enrolled students of each course
    db.$queryRaw<{ courseId: string; n: bigint }[]>`
      SELECT l."courseId", COUNT(*)::bigint AS n
      FROM "LessonProgress" lp
      JOIN "Lesson" l ON l.id = lp."lessonId"
      JOIN "Enrollment" e ON e."courseId" = l."courseId" AND e."studentId" = lp."studentId" AND e.status = 'ACTIVE'
      WHERE lp."completedAt" IS NOT NULL AND l."isPublished" = true AND l."courseId" = ANY(${courseIds})
      GROUP BY l."courseId"`,
    db.teacherInvoice.aggregate({ where: { teacherId: id, status: "PAID" }, _sum: { amount: true } }),
  ]);

  const lessonsMap = new Map(publishedLessonsByCourse.map((r) => [r.courseId, r._count]));
  const completedMap = new Map(completedByCourse.map((r) => [r.courseId, Number(r.n)]));
  let possible = 0;
  let completed = 0;
  for (const c of teacher.courses) {
    possible += c._count.enrollments * (lessonsMap.get(c.id) ?? 0);
    completed += completedMap.get(c.id) ?? 0;
  }
  const completion = possible ? Math.round((completed / possible) * 100) : 0;
  // Teacher earnings are not tracked in-platform (codes are sold offline), so show estimated sales value.
  const estimatedSales = teacher.courses.reduce((sum, c) => sum + c.price * c._count.enrollments, 0);
  const suspended = teacher.status === "SUSPENDED" || teacher.manualSuspended || teacher.billingSuspended;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/teachers" className={buttonClass("secondary", "sm")}>
          <ArrowRight className="h-4 w-4" /> العودة للمعلمين
        </Link>
        {can(user, "teachers.impersonate") && (
          <ActionButton action={impersonateTeacher.bind(null, teacher.id)} variant="primary" size="md">
            <LogIn className="h-4 w-4" /> الدخول بصفة المعلم
          </ActionButton>
        )}
      </div>

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-5">
          <Avatar name={teacher.name} src={teacher.avatarUrl} size={84} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">{teacher.name}</h1>
              {suspended ? (
                <Badge tone="amber">{teacher.billingSuspended && !teacher.manualSuspended ? "موقوف (فاتورة متأخرة)" : "موقوف"}</Badge>
              ) : (
                <Badge tone="green">نشط</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted" dir="ltr" style={{ textAlign: "right" }}>
              {[teacher.email, teacher.phone && displayPhone(teacher.phone)].filter(Boolean).join(" · ") || "—"}
            </p>
            <p className="mt-1 text-xs text-muted">عضو منذ: {formatDate(teacher.createdAt)}</p>
            {teacher.bio && <p className="mt-3 max-w-3xl text-sm leading-7">{teacher.bio}</p>}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="الدورات" value={formatNumber(teacher.courses.length)} icon={<BookOpen className="h-6 w-6" />} />
        <StatCard label="الطلاب المسجلون" value={formatNumber(students.length)} icon={<Users className="h-6 w-6" />} tone="teal" />
        <StatCard label="معدل الإكمال" value={`${formatNumber(completion)}%`} icon={<TrendingUp className="h-6 w-6" />} tone="purple" />
        <StatCard
          label="قيمة المبيعات التقديرية"
          value={`${formatNumber(estimatedSales)} د.ع`}
          icon={<Wallet className="h-6 w-6" />}
          tone="amber"
          hint={`مدفوع للمنصة: ${formatNumber(paid._sum.amount ?? 0)} د.ع`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="دورات المعلم" icon={<BookOpen className="h-5 w-5" />} />
        <CardBody className="space-y-3">
          {teacher.courses.length === 0 ? (
            <EmptyState title="لا توجد دورات لهذا المعلم بعد" />
          ) : (
            teacher.courses.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
                <div className="min-w-0">
                  <p className="font-bold">{c.title}</p>
                  {c.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{c.description}</p>}
                  <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                    <span>{formatNumber(c._count.lessons)} درس</span>
                    <span>{formatNumber(c._count.exams)} امتحان</span>
                    <span>{formatNumber(c._count.enrollments)} تسجيل</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  <span className="font-semibold tabular-nums">{formatIQD(c.price)}</span>
                  {can(user, "courses.read") && (
                    <Link href={`/admin/courses?q=${encodeURIComponent(c.title)}`} className="rounded-lg p-2 text-muted hover:bg-surface" title="عرض في الدورات">
                      <Eye className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </>
  );
}
