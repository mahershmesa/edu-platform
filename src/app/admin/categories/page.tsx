import type { Metadata } from "next";
import { FolderOpen, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { SearchBar } from "@/components/ui/search-bar";
import { CategoryFields } from "./category-fields";
import { createCategory, deleteCategory, updateCategory } from "./actions";

export const metadata: Metadata = { title: "الفئات" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("categories.read");
  const params = await searchParams;
  const q = sp(params, "q");
  const canWrite = can(user, "categories.write");
  const canDelete = can(user, "categories.delete");

  const roots = await db.category.findMany({
    where: {
      parentId: null,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { children: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { courses: true } },
      children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { courses: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="الفئات والفئات الفرعية"
        description="تنظيم الدورات في فئات رئيسية وفئات فرعية (مستويان)"
        icon={<FolderOpen className="h-6 w-6" />}
        actions={
          canWrite && (
            <FormDialog
              title="إضافة فئة جديدة"
              action={createCategory}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة فئة
                </Button>
              }
            >
              <CategoryFields />
            </FormDialog>
          )
        }
      />
      <SearchBar placeholder="ابحث باسم الفئة أو الوصف..." defaultValue={q} label="البحث في الفئات" />

      {roots.length === 0 ? (
        <div className="card">
          <EmptyState title={q ? "لا توجد نتائج" : "لا توجد فئات بعد"} description={q ? "جرّب كلمة بحث أخرى" : "ابدأ بإضافة أول فئة"} />
        </div>
      ) : (
        <div className="space-y-4">
          {roots.map((cat) => {
            const total = cat._count.courses + cat.children.reduce((n, c) => n + c._count.courses, 0);
            return (
              <details key={cat.id} className="card group overflow-hidden" open>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{cat.name}</h2>
                      <Badge tone={cat.isActive ? "green" : "gray"}>{cat.isActive ? "نشطة" : "مخفية"}</Badge>
                    </div>
                    {cat.description && <p className="mt-1 text-sm text-muted">{cat.description}</p>}
                    <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                      <span>{formatNumber(total)} دورة</span>
                      <span>{formatNumber(cat.children.length)} فئة فرعية</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {canWrite && (
                      <FormDialog
                        title={`تعديل: ${cat.name}`}
                        action={updateCategory.bind(null, cat.id)}
                        trigger={
                          <Button variant="secondary" size="sm">
                            <Pencil className="h-3.5 w-3.5" /> تعديل
                          </Button>
                        }
                      >
                        <CategoryFields category={cat} />
                      </FormDialog>
                    )}
                    {canDelete && (
                      <ConfirmAction
                        title="حذف الفئة"
                        message={`سيتم حذف "${cat.name}" وكل فئاتها الفرعية. لا يمكن الحذف إن كانت هناك دورات مرتبطة.`}
                        action={deleteCategory.bind(null, cat.id)}
                        confirmLabel="حذف"
                        trigger={
                          <Button variant="danger" size="sm">
                            <Trash2 className="h-3.5 w-3.5" /> حذف
                          </Button>
                        }
                      />
                    )}
                  </div>
                </summary>
                <div className="border-t border-line bg-surface/50 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold">الفئات الفرعية</h3>
                    {canWrite && (
                      <FormDialog
                        title={`فئة فرعية جديدة في ${cat.name}`}
                        action={createCategory}
                        trigger={
                          <Button size="sm">
                            <Plus className="h-3.5 w-3.5" /> إضافة فئة فرعية
                          </Button>
                        }
                      >
                        <CategoryFields parentId={cat.id} />
                      </FormDialog>
                    )}
                  </div>
                  {cat.children.length === 0 ? (
                    <EmptyState icon={<Layers className="h-6 w-6" />} title="لا توجد فئات فرعية" />
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {cat.children.map((sub) => (
                        <li key={sub.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{sub.name}</p>
                            <p className="text-xs text-muted">
                              {formatNumber(sub._count.courses)} دورة {!sub.isActive && "· مخفية"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {canWrite && (
                              <FormDialog
                                title={`تعديل: ${sub.name}`}
                                action={updateCategory.bind(null, sub.id)}
                                trigger={
                                  <Button variant="ghost" size="icon" aria-label="تعديل">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                }
                              >
                                <CategoryFields category={sub} />
                              </FormDialog>
                            )}
                            {canDelete && (
                              <ConfirmAction
                                title="حذف الفئة الفرعية"
                                message={`حذف "${sub.name}"؟`}
                                action={deleteCategory.bind(null, sub.id)}
                                confirmLabel="حذف"
                                trigger={
                                  <Button variant="ghost" size="icon" aria-label="حذف" className="text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
