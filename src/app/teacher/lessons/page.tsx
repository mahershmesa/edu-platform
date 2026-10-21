import type { Metadata } from "next";
import { PlayCircle, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { LessonFields } from "@/components/courses/lesson-fields";
import { LessonList } from "@/components/courses/lesson-list";
import { createLesson } from "./actions";

export const metadata: Metadata = { title: "الدروس" };

export default async function TeacherLessonsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const q = sp(params, "q");
  const course = sp(params, "course");
  const page = pageFrom(params);
  const editable = teacherCanEdit(user);

  const where = {
    course: { teacherId: user.id },
    ...(course && { courseId: course }),
    ...(q && { title: { contains: q, mode: "insensitive" as const } }),
  };
  const [lessons, total, courses, pdfs] = await Promise.all([
    db.lesson.findMany({
      where,
      orderBy: course ? [{ sortOrder: "asc" }, { createdAt: "asc" }] : [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { course: { select: { id: true, title: true } }, attachment: { select: { originalName: true } } },
    }),
    db.lesson.count({ where }),
    db.course.findMany({ where: { teacherId: user.id }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    db.mediaFile.findMany({ where: { ownerId: user.id, mimeType: "application/pdf" }, select: { id: true, originalName: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="إدارة الدروس"
        description="دروس الفيديو في كل دوراتك"
        icon={<PlayCircle className="h-6 w-6" />}
        actions={
          editable &&
          courses.length > 0 && (
            <FormDialog
              title="إضافة درس جديد"
              action={createLesson}
              size="lg"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة درس
                </Button>
              }
            >
              <LessonFields courses={courses} pdfs={pdfs} defaultCourseId={course || undefined} />
            </FormDialog>
          )
        }
      />
      <SearchBar placeholder="ابحث بعنوان الدرس..." defaultValue={q} label="البحث في الدروس">
        <FilterSelect name="course" label="الدورة" allLabel="كل الدورات" defaultValue={course} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
      </SearchBar>
      <div className="card p-4">
        {courses.length === 0 ? (
          <EmptyState
            title="أنشئ دورة أولاً"
            description="الدروس تُضاف داخل الدورات"
            action={<LinkButton href="/teacher/courses">الذهاب إلى الدورات</LinkButton>}
          />
        ) : lessons.length === 0 ? (
          <EmptyState title={q || course ? "لا توجد نتائج" : "لا توجد دروس بعد"} />
        ) : (
          <>
            {course && !q && <p className="mb-3 text-xs text-muted">يمكنك تغيير ترتيب الدروس بالأسهم.</p>}
            <LessonList lessons={lessons} courses={courses} pdfs={pdfs} editable={editable} reorder={!!course && !q && total <= PAGE_SIZE} />
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/teacher/lessons" />
          </>
        )}
      </div>
    </>
  );
}
