import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { courseCardSelect, publicCourseWhere } from "@/server/catalog";
import { CourseGrid } from "@/components/site/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/format";

async function load(id: string) {
  return db.category.findFirst({
    where: { id, isActive: true },
    include: {
      parent: { select: { id: true, name: true, isActive: true } },
      children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cat = await load((await params).id);
  return cat ? { title: cat.name, description: cat.description ?? `دورات ${cat.name}` } : { title: "غير موجود" };
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = await load(id);
  if (!cat || (cat.parent && !cat.parent.isActive)) notFound();
  const courses = await db.course.findMany({
    where: { ...publicCourseWhere, OR: [{ categoryId: cat.id }, { category: { parentId: cat.id, isActive: true } }] },
    select: courseCardSelect,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="المسار">
        <Link href="/courses" className="hover:text-brand-700">الدورات</Link>
        <ChevronLeft className="h-4 w-4" />
        {cat.parent && (
          <>
            <Link href={`/categories/${cat.parent.id}`} className="hover:text-brand-700">{cat.parent.name}</Link>
            <ChevronLeft className="h-4 w-4" />
          </>
        )}
        <span className="font-semibold text-ink">{cat.name}</span>
      </nav>
      <h1 className="text-2xl font-extrabold sm:text-3xl">{cat.name}</h1>
      {cat.description && <p className="mt-2 max-w-2xl leading-7 text-muted">{cat.description}</p>}

      {cat.children.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {cat.children.map((s) => (
            <Link
              key={s.id}
              href={`/categories/${s.id}`}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 mb-4 text-sm text-muted">{formatNumber(courses.length)} دورة</p>
      {courses.length > 0 ? (
        <CourseGrid courses={courses} />
      ) : (
        <div className="card">
          <EmptyState title="لا توجد دورات في هذه الفئة بعد" />
        </div>
      )}
    </div>
  );
}
