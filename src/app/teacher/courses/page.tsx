import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList, Eye, EyeOff, Pencil, PlayCircle, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { formatIQD, formatNumber } from "@/lib/format";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { CourseFields } from "@/components/courses/course-fields";
import { CourseImage } from "@/components/courses/course-image";
import { categoryOptions, categoryPath, COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from "@/server/courses";
import { createTeacherCourse, setTeacherCourseStatus, updateTeacherCourse } from "./actions";

export const metadata: Metadata = { title: "دوراتي" };

export default async function TeacherCoursesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const q = sp(params, "q");
  const status = sp(params, "status");
  const editable = teacherCanEdit(user);

  const [courses, categories] = await Promise.all([
    db.course.findMany({
      where: {
        teacherId: user.id,
        ...(q && { title: { contains: q, mode: "insensitive" } }),
        ...(status && ["DRAFT", "PUBLISHED", "HIDDEN"].includes(status) && { status: status as "DRAFT" }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true, parent: { select: { name: true } } } },
        _count: { select: { lessons: true, exams: true, enrollments: { where: { status: "ACTIVE" } } } },
      },
    }),
    categoryOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="دوراتي"
        description="أنشئ دوراتك وأدر محتواها"
        icon={<BookOpen className="h-6 w-6" />}
        actions={
          editable && (
            <FormDialog
              title="إضافة دورة جديدة"
              action={createTeacherCourse}
              size="lg"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة دورة
                </Button>
              }
            >
              <CourseFields categories={categories} />
            </FormDialog>
          )
        }
      />
      <SearchBar placeholder="ابحث بعنوان الدورة..." defaultValue={q} label="البحث في دوراتي">
        <FilterSelect
          name="status"
          label="الحالة"
          allLabel="كل الحالات"
          defaultValue={status}
          options={Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </SearchBar>

      {courses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="h-7 w-7" />}
            title={q || status ? "لا توجد نتائج" : "لم تُنشئ أي دورة بعد"}
            description={q || status ? undefined : "ابدأ بإنشاء دورتك الأولى ثم أضف إليها الدروس"}
          />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="card flex flex-col overflow-hidden">
              <Link href={`/teacher/courses/${c.id}`} className="relative block">
                <CourseImage src={c.imageUrl} alt={c.title} className="aspect-[16/9] w-full" />
                <Badge tone={COURSE_STATUS_TONES[c.status]} className="absolute top-3 right-3 shadow-sm">
                  {COURSE_STATUS_LABELS[c.status]}
                </Badge>
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link href={`/teacher/courses/${c.id}`} className="font-bold hover:text-brand-700">
                  {c.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">{categoryPath(c.category)}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <PlayCircle className="h-3.5 w-3.5" /> {formatNumber(c._count.lessons)} درس
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" /> {formatNumber(c._count.exams)} امتحان
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {formatNumber(c._count.enrollments)} طالب
                  </span>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 mt-4">
                  <span className="font-bold text-brand-700">{formatIQD(c.price)}</span>
                  {editable && (
                    <div className="flex gap-1">
                      <FormDialog
                        title={`تعديل: ${c.title}`}
                        action={updateTeacherCourse.bind(null, c.id)}
                        size="lg"
                        trigger={
                          <Button variant="secondary" size="sm">
                            <Pencil className="h-3.5 w-3.5" /> تعديل
                          </Button>
                        }
                      >
                        <CourseFields course={c} categories={categories} />
                      </FormDialog>
                      {c.status === "PUBLISHED" ? (
                        <ActionButton action={setTeacherCourseStatus.bind(null, c.id, "HIDDEN")}>
                          <EyeOff className="h-3.5 w-3.5" /> إخفاء
                        </ActionButton>
                      ) : (
                        <ActionButton action={setTeacherCourseStatus.bind(null, c.id, "PUBLISHED")} variant="primary">
                          <Eye className="h-3.5 w-3.5" /> نشر
                        </ActionButton>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
