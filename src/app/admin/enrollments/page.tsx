import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { RotateCcw, UserCheck, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { displayPhone, normalizeIraqiPhone } from "@/lib/phone";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { setEnrollmentStatus } from "./actions";

export const metadata: Metadata = { title: "الطلاب المشتركون" };

export default async function EnrollmentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("enrollments.read");
  const params = await searchParams;
  const q = sp(params, "q");
  const teacherId = sp(params, "teacher");
  const courseId = sp(params, "course");
  const status = sp(params, "status");
  const page = pageFrom(params);
  const canWrite = can(user, "enrollments.write");

  const phoneQ = q ? normalizeIraqiPhone(q) : null;
  const where: Prisma.EnrollmentWhereInput = {
    ...(q && {
      OR: [
        { student: { name: { contains: q, mode: "insensitive" } } },
        { student: { email: { contains: q, mode: "insensitive" } } },
        { student: { phone: { contains: phoneQ ?? q.replace(/^0/, "") } } },
        { course: { title: { contains: q, mode: "insensitive" } } },
      ],
    }),
    ...(courseId && { courseId }),
    ...(teacherId && { course: { teacherId } }),
    ...(status === "ACTIVE" || status === "REVOKED" ? { status } : {}),
  };

  const [total, rows, teachers, courses] = await Promise.all([
    db.enrollment.count({ where }),
    db.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        student: { select: { id: true, name: true, phone: true, email: true } },
        course: { select: { id: true, title: true, teacher: { select: { name: true } } } },
        code: { select: { code: true } },
      },
    }),
    db.user.findMany({ where: { type: "TEACHER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.course.findMany({
      where: teacherId ? { teacherId } : undefined,
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  // Progress: completed published lessons / published lessons, per (student, course).
  const courseIds = [...new Set(rows.map((r) => r.courseId))];
  const studentIds = [...new Set(rows.map((r) => r.studentId))];
  const [lessonCounts, progress] = await Promise.all([
    db.lesson.groupBy({ by: ["courseId"], where: { courseId: { in: courseIds }, isPublished: true }, _count: true }),
    db.lessonProgress.findMany({
      where: { studentId: { in: studentIds }, completedAt: { not: null }, lesson: { courseId: { in: courseIds }, isPublished: true } },
      select: { studentId: true, lesson: { select: { courseId: true } } },
    }),
  ]);
  const totalMap = new Map(lessonCounts.map((l) => [l.courseId, l._count]));
  const doneMap = new Map<string, number>();
  for (const p of progress) {
    const k = `${p.studentId}:${p.lesson.courseId}`;
    doneMap.set(k, (doneMap.get(k) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="الطلاب المشتركون" description="اشتراكات الطلاب في الدورات ونسبة تقدمهم" icon={<UserCheck className="h-6 w-6" />} />
      <SearchBar placeholder="ابحث بالطالب أو الدورة..." defaultValue={q}>
        <FilterSelect name="teacher" label="المعلم" allLabel="كل المعلمين" defaultValue={teacherId} options={teachers.map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect name="course" label="الدورة" allLabel="كل الدورات" defaultValue={courseId} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
        <FilterSelect
          name="status"
          label="الحالة"
          allLabel="كل الحالات"
          defaultValue={status}
          options={[
            { value: "ACTIVE", label: "نشط" },
            { value: "REVOKED", label: "ملغى" },
          ]}
        />
      </SearchBar>

      <div className="card p-4">
        {rows.length === 0 ? (
          <EmptyState title={q || teacherId || courseId || status ? "لا توجد نتائج" : "لا توجد اشتراكات بعد"} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الدورة</th>
                  <th>التقدم</th>
                  <th>تاريخ الاشتراك</th>
                  <th>الكود</th>
                  <th>الحالة</th>
                  {canWrite && <th>الإجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const totalLessons = totalMap.get(r.courseId) ?? 0;
                  const doneLessons = doneMap.get(`${r.studentId}:${r.courseId}`) ?? 0;
                  const pct = totalLessons ? Math.min(100, Math.round((doneLessons / totalLessons) * 100)) : 0;
                  return (
                    <tr key={r.id}>
                      <td>
                        <p className="font-semibold">{r.student.name}</p>
                        <p className="text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>
                          {r.student.phone ? displayPhone(r.student.phone) : r.student.email}
                        </p>
                      </td>
                      <td>
                        <p className="font-semibold">{r.course.title}</p>
                        <p className="text-xs text-muted">بواسطة {r.course.teacher.name}</p>
                      </td>
                      <td className="min-w-36">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 text-xs tabular-nums text-muted">{formatNumber(pct)}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-muted">{formatDate(r.createdAt)}</td>
                      <td className="font-mono text-xs" dir="ltr">
                        {r.code?.code ?? <span className="font-sans text-muted">يدوي</span>}
                      </td>
                      <td>{r.status === "ACTIVE" ? <Badge tone="green">نشط</Badge> : <Badge tone="red">ملغى</Badge>}</td>
                      {canWrite && (
                        <td>
                          {r.status === "ACTIVE" ? (
                            <ConfirmAction
                              title="إلغاء الاشتراك"
                              message={`سيفقد ${r.student.name} الوصول إلى دورة "${r.course.title}".`}
                              action={setEnrollmentStatus.bind(null, r.id, true)}
                              confirmLabel="إلغاء الاشتراك"
                              trigger={
                                <Button variant="danger" size="sm">
                                  <XCircle className="h-3.5 w-3.5" /> إلغاء
                                </Button>
                              }
                            />
                          ) : (
                            <ConfirmAction
                              title="استعادة الاشتراك"
                              message={`سيستعيد ${r.student.name} الوصول إلى دورة "${r.course.title}".`}
                              action={setEnrollmentStatus.bind(null, r.id, false)}
                              confirmLabel="استعادة"
                              danger={false}
                              trigger={
                                <Button variant="secondary" size="sm">
                                  <RotateCcw className="h-3.5 w-3.5" /> استعادة
                                </Button>
                              }
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/admin/enrollments" />
          </>
        )}
      </div>
    </>
  );
}
