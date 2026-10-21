import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { courseCardSelect, publicCourseWhere } from "@/server/catalog";
import { CourseGrid } from "@/components/site/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "الدورات", description: "تصفّح كل الدورات المتاحة على المنصة" };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const q = sp(params, "q");
  const category = sp(params, "category");
  const teacher = sp(params, "teacher");
  const page = pageFrom(params);

  const [categories, teachers] = await Promise.all([
    db.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
    }),
    db.user.findMany({
      where: { type: "TEACHER", courses: { some: publicCourseWhere } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const and: Prisma.CourseWhereInput[] = [publicCourseWhere];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { teacher: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  // A root category includes its subcategories.
  if (category) and.push({ OR: [{ categoryId: category }, { category: { parentId: category } }] });
  if (teacher) and.push({ teacherId: teacher });
  const where: Prisma.CourseWhereInput = { AND: and };

  const [courses, total] = await Promise.all([
    db.course.findMany({
      where,
      select: courseCardSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.course.count({ where }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">الدورات</h1>
      <p className="mt-1 text-sm text-muted">اعثر على الدورة المناسبة لمادتك ومرحلتك</p>

      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="ابحث باسم الدورة أو المعلم..." aria-label="بحث" className="input h-11 pr-9" />
        </div>
        <select name="category" defaultValue={category} aria-label="المادة" className="input h-11">
          <option value="">كل المواد</option>
          {categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.id}>كل {c.name}</option>
              {c.children.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select name="teacher" defaultValue={teacher} aria-label="المعلم" className="input h-11">
          <option value="">كل المعلمين</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClass("primary", "lg", "h-11")}>
          بحث
        </button>
      </form>

      <p className="mt-6 mb-4 text-sm text-muted">{formatNumber(total)} دورة</p>
      {courses.length > 0 ? (
        <>
          <CourseGrid courses={courses} />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/courses" />
        </>
      ) : (
        <div className="card">
          <EmptyState title="لا توجد دورات مطابقة" description="جرّب كلمة بحث أخرى أو أزل الفلاتر" />
        </div>
      )}
    </div>
  );
}
