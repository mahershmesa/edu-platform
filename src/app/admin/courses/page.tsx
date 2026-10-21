import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BookOpen, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatIQD, formatNumber } from "@/lib/format";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { CourseFields } from "@/components/courses/course-fields";
import { CourseImage } from "@/components/courses/course-image";
import { categoryOptions, categoryPath, COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from "@/server/courses";
import { createCourse, deleteCourse, updateCourse } from "./actions";

export const metadata: Metadata = { title: "الدورات" };

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("courses.read");
  const params = await searchParams;
  const q = sp(params, "q");
  const teacher = sp(params, "teacher");
  const category = sp(params, "category");
  const status = sp(params, "status");
  const page = pageFrom(params);
  const canWrite = can(user, "courses.write");
  const canDelete = can(user, "courses.delete");

  const and: Prisma.CourseWhereInput[] = [];
  if (q) and.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
  if (teacher) and.push({ teacherId: teacher });
  if (category) and.push({ OR: [{ categoryId: category }, { category: { parentId: category } }] });
  if (["DRAFT", "PUBLISHED", "HIDDEN"].includes(status)) and.push({ status: status as "DRAFT" | "PUBLISHED" | "HIDDEN" });
  const where: Prisma.CourseWhereInput = { AND: and };

  const [courses, total, teachers, categories] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        teacher: { select: { id: true, name: true } },
        category: { select: { name: true, parent: { select: { name: true } } } },
        _count: { select: { lessons: true, enrollments: { where: { status: "ACTIVE" } } } },
      },
    }),
    db.course.count({ where }),
    db.user.findMany({ where: { type: "TEACHER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    categoryOptions(),
  ]);

  const categoryFilter = categories.flatMap((r) => [{ value: r.id, label: r.name }, ...r.children.map((c) => ({ value: c.id, label: `— ${c.name}` }))]);

  return (
    <>
      <PageHeader
        title="إدارة الدورات"
        description="كل دورات المنصة: الإنشاء والتعديل والمتابعة"
        icon={<BookOpen className="h-6 w-6" />}
        actions={
          canWrite && (
            <FormDialog
              title="إضافة دورة جديدة"
              action={createCourse}
              size="lg"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة دورة
                </Button>
              }
            >
              <CourseFields categories={categories} teachers={teachers} />
            </FormDialog>
          )
        }
      />
      <SearchBar placeholder="ابحث بعنوان الدورة..." defaultValue={q} label="البحث في الدورات">
        <FilterSelect name="teacher" label="المعلم" allLabel="كل المعلمين" defaultValue={teacher} options={teachers.map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect name="category" label="الفئة" allLabel="كل الفئات" defaultValue={category} options={categoryFilter} />
        <FilterSelect
          name="status"
          label="الحالة"
          allLabel="كل الحالات"
          defaultValue={status}
          options={Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </SearchBar>

      <div className="card p-4">
        {courses.length === 0 ? (
          <EmptyState title={q || teacher || category || status ? "لا توجد نتائج" : "لا توجد دورات بعد"} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>الدورة</th>
                  <th>المعلم</th>
                  <th>الفئة</th>
                  <th>السعر</th>
                  <th>الطلاب</th>
                  <th>الدروس</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/courses/${c.id}`} className="flex min-w-56 items-center gap-3">
                        <CourseImage src={c.imageUrl} alt={c.title} className="h-12 w-16 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold hover:text-brand-700">{c.title}</p>
                          {c.description && <p className="line-clamp-1 text-xs text-muted">{c.description}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{c.teacher.name}</td>
                    <td className="whitespace-nowrap text-muted">{categoryPath(c.category)}</td>
                    <td className="whitespace-nowrap font-semibold tabular-nums">{formatIQD(c.price)}</td>
                    <td className="tabular-nums">{formatNumber(c._count.enrollments)}</td>
                    <td className="tabular-nums">{formatNumber(c._count.lessons)}</td>
                    <td>
                      <Badge tone={COURSE_STATUS_TONES[c.status]}>{COURSE_STATUS_LABELS[c.status]}</Badge>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <LinkButton href={`/admin/courses/${c.id}`} variant="ghost" size="icon" aria-label="التفاصيل">
                          <Eye className="h-4 w-4 text-sky-600" />
                        </LinkButton>
                        {canWrite && (
                          <FormDialog
                            title={`تعديل: ${c.title}`}
                            action={updateCourse.bind(null, c.id)}
                            size="lg"
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="تعديل">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          >
                            <CourseFields course={c} categories={categories} teachers={teachers} />
                          </FormDialog>
                        )}
                        {canDelete && (
                          <ConfirmAction
                            title="حذف الدورة"
                            message={`حذف "${c.title}" مع كل دروسها وامتحاناتها نهائياً؟ لا يمكن حذف دورة فيها طلاب مشتركون.`}
                            action={deleteCourse.bind(null, c.id)}
                            confirmLabel="حذف"
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="حذف" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/admin/courses" />
          </>
        )}
      </div>
    </>
  );
}
