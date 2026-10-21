import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { CalendarDays, Clock, GraduationCap, Mail, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone, normalizeIraqiPhone } from "@/lib/phone";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "الطلاب" };

export default async function TeacherStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const q = sp(params, "q");
  const courseId = sp(params, "courseId");
  const page = pageFrom(params);
  const phone = q ? normalizeIraqiPhone(q) : null;

  const where: Prisma.EnrollmentWhereInput = {
    course: { teacherId: user.id },
    ...(courseId && { courseId }),
    ...(q && {
      student: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          ...(phone ? [{ phone }] : [{ phone: { contains: q } }]),
        ],
      },
    }),
  };

  const [courses, total, studentCount, enrollments] = await Promise.all([
    db.course.findMany({ where: { teacherId: user.id }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }),
    db.enrollment.count({ where }),
    db.enrollment.findMany({ where: { course: { teacherId: user.id }, status: "ACTIVE" }, distinct: ["studentId"], select: { studentId: true } }),
    db.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        student: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, lastLoginAt: true, createdAt: true } },
        course: { select: { id: true, title: true } },
      },
    }),
  ]);

  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
  const [lessonCounts, progress] = await Promise.all([
    db.lesson.groupBy({ by: ["courseId"], where: { courseId: { in: courseIds }, isPublished: true }, _count: { _all: true } }),
    db.lessonProgress.findMany({
      where: { studentId: { in: studentIds }, lesson: { courseId: { in: courseIds } } },
      select: { studentId: true, completedAt: true, updatedAt: true, lesson: { select: { courseId: true, isPublished: true } } },
    }),
  ]);
  const lessonsPerCourse = new Map(lessonCounts.map((l) => [l.courseId, l._count._all]));
  const done = new Map<string, number>();
  const lastActivity = new Map<string, Date>();
  for (const p of progress) {
    const key = `${p.studentId}:${p.lesson.courseId}`;
    if (p.completedAt && p.lesson.isPublished) done.set(key, (done.get(key) ?? 0) + 1);
    const prev = lastActivity.get(p.studentId);
    if (!prev || p.updatedAt > prev) lastActivity.set(p.studentId, p.updatedAt);
  }

  return (
    <>
      <PageHeader
        title="الطلاب المسجلون"
        description="جميع الطلاب المسجلين في دوراتك وتقدّمهم"
        icon={<GraduationCap className="h-6 w-6" />}
        actions={<Badge tone="green">{formatNumber(studentCount.length)} طالب</Badge>}
      />
      <SearchBar placeholder="ابحث بالاسم أو البريد أو رقم الهاتف..." defaultValue={q} label="البحث والتصفية">
        <FilterSelect name="courseId" label="الدورة" allLabel="جميع الدورات" defaultValue={courseId} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
      </SearchBar>

      {enrollments.length === 0 ? (
        <div className="card">
          <EmptyState title={q || courseId ? "لا توجد نتائج" : "لا يوجد طلاب بعد"} description={q || courseId ? "جرّب بحثاً آخر" : "سيظهر الطلاب هنا عندما يفتحون دوراتك بالأكواد"} />
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => {
            const totalLessons = lessonsPerCourse.get(e.courseId) ?? 0;
            const completed = done.get(`${e.studentId}:${e.courseId}`) ?? 0;
            const pct = totalLessons ? Math.min(100, Math.round((completed / totalLessons) * 100)) : 0;
            const activity = lastActivity.get(e.studentId) ?? e.student.lastLoginAt;
            return (
              <article key={e.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={e.student.name} src={e.student.avatarUrl} size={48} />
                  <div className="min-w-0">
                    <p className="font-bold">{e.student.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted" dir="ltr">
                      {e.student.phone ? <Phone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                      {e.student.phone ? displayPhone(e.student.phone) : e.student.email}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" /> انضم: {formatDate(e.student.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> آخر نشاط: {formatDateTime(activity)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="min-w-[180px]">
                    <p className="font-semibold">{e.course.title}</p>
                    <p className="text-xs text-muted">سُجّل في: {formatDate(e.createdAt)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatNumber(completed)} من {formatNumber(totalLessons)} درس
                    </p>
                  </div>
                  <Badge tone={e.status === "ACTIVE" ? "green" : "gray"}>{e.status === "ACTIVE" ? "نشط" : "ملغى"}</Badge>
                </div>
              </article>
            );
          })}
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/teacher/students" />
        </div>
      )}
    </>
  );
}
