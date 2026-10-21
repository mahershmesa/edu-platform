import Link from "next/link";
import type { Metadata } from "next";
import { BadgeDollarSign, BookOpen, ClipboardList, FileText, GraduationCap, LayoutGrid, UserCheck, Users } from "lucide-react";
import { db } from "@/lib/db";
import { can, requireAdminArea } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { cn, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "لوحة التحكم" };

const PERIODS = [7, 30, 90] as const;

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireAdminArea();
  const params = await searchParams;
  const denied = sp(params, "denied") === "1";

  if (!can(user, "dashboard.view")) {
    return (
      <>
        {denied && (
          <Alert tone="warning" className="mb-6">
            ليست لديك صلاحية لهذه الصفحة.
          </Alert>
        )}
        <PageHeader title={`مرحباً، ${user.name}`} description="اختر قسماً من القائمة الجانبية حسب صلاحياتك." icon={<LayoutGrid className="h-6 w-6" />} />
      </>
    );
  }

  const periodParam = Number(sp(params, "period"));
  const period = (PERIODS as readonly number[]).includes(periodParam) ? periodParam : 30;
  const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const [courses, lessons, students, newStudents, enrollments, newEnrollments, teachers, exams, revenue, latestCourses, latestStudents] =
    await Promise.all([
      db.course.count(),
      db.lesson.count(),
      db.user.count({ where: { type: "STUDENT" } }),
      db.user.count({ where: { type: "STUDENT", createdAt: { gte: since } } }),
      db.enrollment.count({ where: { status: "ACTIVE" } }),
      db.enrollment.count({ where: { status: "ACTIVE", createdAt: { gte: since } } }),
      db.user.count({ where: { type: "TEACHER" } }),
      db.exam.count(),
      db.teacherInvoice.aggregate({ _sum: { amount: true }, where: { status: "PAID", paidAt: { gte: since } } }),
      db.course.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { teacher: { select: { name: true } }, _count: { select: { lessons: true, enrollments: { where: { status: "ACTIVE" } } } } },
      }),
      db.user.findMany({
        where: { type: "STUDENT" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
      }),
    ]);

  return (
    <>
      {denied && (
        <Alert tone="warning" className="mb-6">
          ليست لديك صلاحية لهذه الصفحة.
        </Alert>
      )}
      <PageHeader
        title="لوحة التحكم"
        description="نظرة عامة على المنصة والإحصائيات"
        icon={<LayoutGrid className="h-6 w-6" />}
        actions={
          <div className="flex rounded-xl border border-line bg-white p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin?period=${p}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                  p === period ? "bg-brand-600 text-white" : "text-muted hover:bg-surface",
                )}
              >
                آخر {formatNumber(p)} يوم
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الدورات" value={formatNumber(courses)} icon={<BookOpen className="h-6 w-6" />} />
        <StatCard label="إجمالي الدروس" value={formatNumber(lessons)} icon={<FileText className="h-6 w-6" />} tone="teal" />
        <StatCard
          label="إجمالي الطلاب"
          value={formatNumber(students)}
          icon={<GraduationCap className="h-6 w-6" />}
          tone="blue"
          hint={`+${formatNumber(newStudents)} خلال الفترة`}
        />
        <StatCard
          label="الاشتراكات النشطة"
          value={formatNumber(enrollments)}
          icon={<UserCheck className="h-6 w-6" />}
          tone="purple"
          hint={`+${formatNumber(newEnrollments)} خلال الفترة`}
        />
        <StatCard label="المعلمون" value={formatNumber(teachers)} icon={<Users className="h-6 w-6" />} tone="amber" />
        <StatCard label="الامتحانات" value={formatNumber(exams)} icon={<ClipboardList className="h-6 w-6" />} tone="teal" />
        <StatCard
          label="إيرادات اشتراكات المعلمين"
          value={`${formatNumber(revenue._sum.amount ?? 0)} د.ع`}
          icon={<BadgeDollarSign className="h-6 w-6" />}
          hint={`الفواتير المدفوعة خلال آخر ${formatNumber(period)} يوم`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="أحدث الدورات" icon={<BookOpen className="h-5 w-5" />} action={<Link href="/admin/courses" className="text-sm font-semibold text-brand-700 hover:underline">عرض الكل</Link>} />
          <CardBody className="space-y-3">
            {latestCourses.length === 0 ? (
              <EmptyState title="لا توجد دورات بعد" />
            ) : (
              latestCourses.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{c.title}</p>
                    <p className="text-sm text-muted">{c.teacher.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatNumber(c._count.enrollments)} طالب مشترك · {formatNumber(c._count.lessons)} درس
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{formatDate(c.createdAt)}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="أحدث الطلاب المسجلين" icon={<Users className="h-5 w-5" />} action={<Link href="/admin/students" className="text-sm font-semibold text-brand-700 hover:underline">عرض الكل</Link>} />
          <CardBody className="space-y-3">
            {latestStudents.length === 0 ? (
              <EmptyState title="لا يوجد طلاب بعد" />
            ) : (
              latestStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{s.name}</p>
                    <p className="truncate text-sm text-muted" dir="ltr">
                      {s.phone ? displayPhone(s.phone) : s.email}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {s._count.enrollments ? `${formatNumber(s._count.enrollments)} اشتراك` : "بدون اشتراك"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-xs text-muted">{formatDate(s.createdAt)}</span>
                    {s.status === "ACTIVE" ? <Badge tone="green">نشط</Badge> : <Badge tone="amber">موقوف</Badge>}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
