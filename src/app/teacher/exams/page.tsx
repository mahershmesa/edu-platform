import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Clock, FileQuestion, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { ExamSettingsFields } from "@/components/exams/exam-settings-fields";
import { createExam } from "./actions";

export const metadata: Metadata = { title: "الامتحانات" };

export default async function TeacherExamsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const q = sp(params, "q");
  const courseId = sp(params, "course");
  const editable = teacherCanEdit(user);

  const [courses, exams] = await Promise.all([
    db.course.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } } },
    }),
    db.exam.findMany({
      where: {
        course: { teacherId: user.id },
        ...(courseId && { courseId }),
        ...(q && { title: { contains: q, mode: "insensitive" } }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { title: true } },
        lesson: { select: { title: true } },
        _count: { select: { questions: true, attempts: { where: { submittedAt: { not: null } } } } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="إدارة الامتحانات"
        description="أنشئ امتحانات لدوراتك وتابع نتائج طلابك"
        icon={<ClipboardList className="h-6 w-6" />}
        actions={
          editable &&
          courses.length > 0 && (
            <FormDialog
              title="إنشاء امتحان جديد"
              description="اختر الدورة وحدد إعدادات الامتحان، ثم أضف الأسئلة في الصفحة التالية."
              action={createExam}
              submitLabel="متابعة لإضافة الأسئلة"
              size="lg"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة امتحان جديد
                </Button>
              }
            >
              <ExamSettingsFields courses={courses} />
            </FormDialog>
          )
        }
      />
      <SearchBar placeholder="ابحث بعنوان الامتحان..." defaultValue={q} label="البحث في الامتحانات">
        <FilterSelect
          name="course"
          label="الدورة"
          allLabel="كل الدورات"
          defaultValue={courseId}
          options={courses.map((c) => ({ value: c.id, label: c.title }))}
        />
      </SearchBar>

      {exams.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title={q || courseId ? "لا توجد نتائج" : "لا توجد امتحانات بعد"}
            description={courses.length === 0 ? "أنشئ دورة أولاً ثم أضف لها امتحاناً" : "ابدأ بإنشاء أول امتحان لدوراتك"}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {exams.map((e) => (
            <li key={e.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/teacher/exams/${e.id}`} className="font-bold hover:text-brand-700">
                      {e.title}
                    </Link>
                    <Badge tone={e.isActive ? "green" : "gray"}>{e.isActive ? "متاح" : "غير متاح"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {e.course.title}
                    {e.lesson && ` · ${e.lesson.title}`}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {formatNumber(e.durationMin)} دقيقة
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileQuestion className="h-3.5 w-3.5" /> {formatNumber(e._count.questions)} سؤال
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {formatNumber(e._count.attempts)} محاولة
                    </span>
                    <span>النجاح من {formatNumber(e.passPercent)}%</span>
                    <span>{e.maxAttempts ? `${formatNumber(e.maxAttempts)} محاولات مسموحة` : "محاولات بلا حد"}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <LinkButton href={`/teacher/exams/${e.id}/results`} variant="secondary" size="sm">
                  النتائج
                </LinkButton>
                <LinkButton href={`/teacher/exams/${e.id}`} size="sm">
                  {editable ? "تعديل الأسئلة" : "عرض"}
                </LinkButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
