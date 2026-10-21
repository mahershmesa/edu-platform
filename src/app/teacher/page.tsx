import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookOpen, CheckCircle2, Clock, FileText, GraduationCap, LayoutGrid, PlayCircle, Receipt, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { invoiceView } from "@/lib/domain/invoices";
import { formatIQD, formatNumber, formatShortDate } from "@/lib/format";
import { cn, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";

export const metadata: Metadata = { title: "لوحة المعلم" };

const PERIODS = [7, 30, 90] as const;
const COURSE_STATUS: Record<string, { label: string; tone: "green" | "gray" | "amber" }> = {
  PUBLISHED: { label: "منشورة", tone: "green" },
  DRAFT: { label: "مسودة", tone: "gray" },
  HIDDEN: { label: "مخفية", tone: "amber" },
};

export default async function TeacherHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp(params, "days")) ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const mine = { course: { teacherId: user.id } };

  const [courses, lessons, enrollmentsTotal, enrollmentsPeriod, students, invoices, latestEnrollments, latestCourses] = await Promise.all([
    db.course.count({ where: { teacherId: user.id } }),
    db.lesson.count({ where: mine }),
    db.enrollment.count({ where: { ...mine, status: "ACTIVE" } }),
    db.enrollment.count({ where: { ...mine, status: "ACTIVE", createdAt: { gte: since } } }),
    db.enrollment.findMany({ where: { ...mine, status: "ACTIVE" }, distinct: ["studentId"], select: { studentId: true } }),
    db.teacherInvoice.findMany({ where: { teacherId: user.id, status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" } }),
    db.enrollment.findMany({
      where: { ...mine, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { student: { select: { name: true } }, course: { select: { title: true } } },
    }),
    db.course.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { lessons: true, enrollments: true } } },
    }),
  ]);

  const now = new Date();
  const invViews = invoices.map((i) => invoiceView(i, now));
  const lastInvoice = invoices[0];

  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        description="نظرة عامة على أداء دوراتك وطلابك"
        icon={<LayoutGrid className="h-6 w-6" />}
        actions={
          <div className="flex rounded-xl border border-line bg-white p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={p === 30 ? "/teacher" : `/teacher?days=${p}`}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", p === days ? "bg-brand-600 text-white" : "text-muted hover:text-ink")}
              >
                آخر {p} يوم
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الدورات" value={formatNumber(courses)} icon={<BookOpen className="h-6 w-6" />} />
        <StatCard label="إجمالي الدروس" value={formatNumber(lessons)} icon={<PlayCircle className="h-6 w-6" />} tone="teal" />
        <StatCard
          label="التسجيلات"
          value={formatNumber(enrollmentsTotal)}
          hint={`${formatNumber(enrollmentsPeriod)} خلال آخر ${days} يوم`}
          icon={<Users className="h-6 w-6" />}
          tone="blue"
        />
        <StatCard label="الطلاب" value={formatNumber(students.length)} hint="طلاب مختلفون في دوراتك" icon={<GraduationCap className="h-6 w-6" />} tone="purple" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الفواتير" value={formatNumber(invoices.length)} icon={<Receipt className="h-6 w-6" />} tone="blue" />
        <StatCard label="الفواتير المدفوعة" value={formatNumber(invViews.filter((v) => v === "PAID").length)} icon={<CheckCircle2 className="h-6 w-6" />} />
        <StatCard label="الفواتير المتأخرة" value={formatNumber(invViews.filter((v) => v === "OVERDUE").length)} icon={<AlertTriangle className="h-6 w-6" />} tone="red" />
        <StatCard
          label="حالة آخر فاتورة"
          value={lastInvoice ? <InvoiceStatusBadge view={invViews[0]} /> : <span className="text-base text-muted">لا توجد</span>}
          hint={lastInvoice ? formatIQD(lastInvoice.amount) : undefined}
          icon={<Clock className="h-6 w-6" />}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="أحدث التسجيلات"
            description={`خلال آخر ${days} يوم`}
            icon={<Users className="h-5 w-5" />}
            action={
              <Link href="/teacher/students" className="text-sm font-semibold text-brand-700 hover:underline">
                عرض الكل
              </Link>
            }
          />
          {latestEnrollments.length === 0 ? (
            <EmptyState title="لا توجد تسجيلات في هذه الفترة" />
          ) : (
            <ul className="divide-y divide-line">
              {latestEnrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{e.student.name}</p>
                    <p className="truncate text-xs text-muted">{e.course.title}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted">{formatShortDate(e.createdAt)}</p>
                    <Badge tone={e.status === "ACTIVE" ? "green" : "gray"} className="mt-1">
                      {e.status === "ACTIVE" ? "نشط" : "ملغى"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader
            title="أحدث الدورات"
            icon={<BookOpen className="h-5 w-5" />}
            action={
              <Link href="/teacher/courses" className="text-sm font-semibold text-brand-700 hover:underline">
                إدارة الدورات
              </Link>
            }
          />
          {latestCourses.length === 0 ? (
            <EmptyState icon={<FileText className="h-7 w-7" />} title="لا توجد دورات بعد" description="أنشئ دورتك الأولى من صفحة الدورات" />
          ) : (
            <ul className="divide-y divide-line">
              {latestCourses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.title}</p>
                    <p className="text-xs text-muted">
                      {formatNumber(c._count.lessons)} درس · {formatNumber(c._count.enrollments)} طالب · {formatIQD(c.price)}
                    </p>
                  </div>
                  <Badge tone={COURSE_STATUS[c.status].tone}>{COURSE_STATUS[c.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
