import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, PlayCircle, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { formatDate, formatDuration, formatIQD, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { CourseImage } from "@/components/courses/course-image";
import { categoryPath, COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from "@/server/courses";

export const metadata: Metadata = { title: "تفاصيل الدورة" };

export default async function AdminCourseDetails({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("courses.read");
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
      lessons: { orderBy: { sortOrder: "asc" } },
      _count: { select: { exams: true, enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!course) notFound();
  const totalMin = course.lessons.reduce((n, l) => n + (l.durationMin ?? 0), 0);

  return (
    <>
      <PageHeader
        title={course.title}
        description={`${course.teacher.name} · ${categoryPath(course.category)}`}
        icon={<BookOpen className="h-6 w-6" />}
        actions={
          <LinkButton href="/admin/courses" variant="secondary">
            <ArrowRight className="h-4 w-4" /> العودة للدورات
          </LinkButton>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-1">
          <CourseImage src={course.imageUrl} alt={course.title} className="aspect-[4/3] w-full" />
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">الحالة</span>
              <Badge tone={COURSE_STATUS_TONES[course.status]}>{COURSE_STATUS_LABELS[course.status]}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">السعر</span>
              <span className="font-bold">{formatIQD(course.price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">المعلم</span>
              <Link href={`/admin/teachers/${course.teacher.id}`} className="font-semibold text-brand-700 hover:underline">
                {course.teacher.name}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">تاريخ الإنشاء</span>
              <span>{formatDate(course.createdAt)}</span>
            </div>
            {course.description && <p className="border-t border-line pt-3 leading-7 whitespace-pre-line text-muted">{course.description}</p>}
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="الدروس" value={formatNumber(course.lessons.length)} hint={formatDuration(totalMin)} icon={<PlayCircle className="h-6 w-6" />} />
            <StatCard label="الامتحانات" value={formatNumber(course._count.exams)} icon={<ClipboardList className="h-6 w-6" />} tone="blue" />
            <StatCard label="الطلاب المشتركون" value={formatNumber(course._count.enrollments)} icon={<Users className="h-6 w-6" />} tone="teal" />
          </div>
          <Card>
            <CardHeader title="الدروس" description="بالترتيب الذي يراه الطالب" />
            <div className="p-4">
              {course.lessons.length === 0 ? (
                <EmptyState title="لا توجد دروس بعد" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>العنوان</th>
                      <th>المدة</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.lessons.map((l, i) => (
                      <tr key={l.id}>
                        <td className="tabular-nums text-muted">{i + 1}</td>
                        <td className="font-medium">{l.title}</td>
                        <td className="whitespace-nowrap text-muted">{formatDuration(l.durationMin)}</td>
                        <td>
                          <div className="flex gap-1">
                            <Badge tone={l.isPublished ? "green" : "gray"}>{l.isPublished ? "منشور" : "غير منشور"}</Badge>
                            {l.isFree && <Badge tone="blue">مجاني</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
