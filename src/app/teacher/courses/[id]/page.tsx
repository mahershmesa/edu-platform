import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ClipboardList, Pencil, PlayCircle, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { formatDuration, formatIQD, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { CourseFields } from "@/components/courses/course-fields";
import { CourseImage } from "@/components/courses/course-image";
import { LessonFields } from "@/components/courses/lesson-fields";
import { LessonList } from "@/components/courses/lesson-list";
import { categoryOptions, categoryPath, COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from "@/server/courses";
import { updateTeacherCourse } from "../actions";
import { createLesson } from "../../lessons/actions";

export const metadata: Metadata = { title: "تفاصيل الدورة" };

export default async function TeacherCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  const { id } = await params;
  const course = await db.course.findFirst({
    where: { id, teacherId: user.id },
    include: {
      category: { select: { name: true, parent: { select: { name: true } } } },
      lessons: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { course: { select: { id: true, title: true } }, attachment: { select: { originalName: true } } },
      },
      _count: { select: { exams: true, enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!course) notFound();
  const editable = teacherCanEdit(user);
  const [courses, pdfs, categories] = await Promise.all([
    db.course.findMany({ where: { teacherId: user.id }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    db.mediaFile.findMany({ where: { ownerId: user.id, mimeType: "application/pdf" }, select: { id: true, originalName: true } }),
    categoryOptions(),
  ]);
  const totalMin = course.lessons.reduce((n, l) => n + (l.durationMin ?? 0), 0);

  return (
    <>
      <PageHeader
        title={course.title}
        description={categoryPath(course.category)}
        icon={<BookOpen className="h-6 w-6" />}
        actions={
          <>
            <LinkButton href="/teacher/courses" variant="secondary">
              <ArrowRight className="h-4 w-4" /> دوراتي
            </LinkButton>
            {editable && (
              <FormDialog
                title={`تعديل: ${course.title}`}
                action={updateTeacherCourse.bind(null, course.id)}
                size="lg"
                trigger={
                  <Button variant="secondary">
                    <Pencil className="h-4 w-4" /> تعديل الدورة
                  </Button>
                }
              >
                <CourseFields course={course} categories={categories} />
              </FormDialog>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden">
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
            {course.description && <p className="border-t border-line pt-3 leading-7 whitespace-pre-line text-muted">{course.description}</p>}
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="الدروس" value={formatNumber(course.lessons.length)} hint={formatDuration(totalMin)} icon={<PlayCircle className="h-6 w-6" />} />
            <StatCard label="الامتحانات" value={formatNumber(course._count.exams)} icon={<ClipboardList className="h-6 w-6" />} tone="blue" />
            <StatCard label="الطلاب" value={formatNumber(course._count.enrollments)} icon={<Users className="h-6 w-6" />} tone="teal" />
          </div>
          <Card>
            <CardHeader
              title="دروس الدورة"
              description="رتّبها بالأسهم كما تريد أن يراها الطالب"
              action={
                editable && (
                  <FormDialog
                    title="إضافة درس"
                    action={createLesson}
                    size="lg"
                    trigger={
                      <Button size="sm">
                        <Plus className="h-4 w-4" /> إضافة درس
                      </Button>
                    }
                  >
                    <LessonFields courses={courses} pdfs={pdfs} defaultCourseId={course.id} />
                  </FormDialog>
                )
              }
            />
            <div className="p-4">
              {course.lessons.length === 0 ? (
                <EmptyState icon={<PlayCircle className="h-7 w-7" />} title="لا توجد دروس بعد" description="أضف أول درس لهذه الدورة" />
              ) : (
                <LessonList lessons={course.lessons} courses={courses} pdfs={pdfs} editable={editable} reorder />
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
