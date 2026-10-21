import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { courseCardSelect, publicCourseWhere } from "@/server/catalog";
import { formatNumber } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { CourseGrid } from "@/components/site/course-card";
import { EmptyState } from "@/components/ui/empty-state";

async function load(id: string) {
  return db.user.findFirst({ where: { id, type: "TEACHER" }, select: { id: true, name: true, bio: true, avatarUrl: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = await load((await params).id);
  return t ? { title: t.name, description: t.bio ?? `دورات ${t.name}` } : { title: "غير موجود" };
}

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await load((await params).id);
  if (!teacher) notFound();
  const courses = await db.course.findMany({
    where: { ...publicCourseWhere, teacherId: teacher.id },
    select: courseCardSelect,
    orderBy: { createdAt: "desc" },
  });
  const lessons = courses.reduce((n, c) => n + c._count.lessons, 0);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="card flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-right">
        <Avatar name={teacher.name} src={teacher.avatarUrl} size={112} className="ring-4 ring-brand-50" />
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{teacher.name}</h1>
          {teacher.bio && <p className="mt-2 max-w-2xl leading-7 whitespace-pre-line text-muted">{teacher.bio}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{formatNumber(courses.length)} دورة</span>
            <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-muted">{formatNumber(lessons)} درس</span>
          </div>
        </div>
      </div>
      <h2 className="mt-10 mb-4 text-xl font-extrabold">دورات المعلم</h2>
      {courses.length > 0 ? (
        <CourseGrid courses={courses} />
      ) : (
        <div className="card">
          <EmptyState title="لا توجد دورات منشورة لهذا المعلم بعد" />
        </div>
      )}
    </div>
  );
}
