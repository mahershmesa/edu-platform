/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Eye, FileText, Globe, ImageIcon, Lock, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { TextField } from "@/components/ui/field";
import { CopyButton } from "@/components/courses/copy-button";
import { UploadDialog } from "./upload-dialog";
import { deleteMedia, toggleMediaPublic, updateMedia } from "./actions";

export const metadata: Metadata = { title: "مكتبة الوسائط" };

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${formatNumber(Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default async function TeacherMediaPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const q = sp(params, "q");
  const type = sp(params, "type");
  const group = sp(params, "group");
  const page = pageFrom(params);
  const editable = teacherCanEdit(user);

  const where: Prisma.MediaFileWhereInput = {
    ownerId: user.id,
    ...(q && { originalName: { contains: q, mode: "insensitive" } }),
    ...(type === "image" && { mimeType: { startsWith: "image/" } }),
    ...(type === "pdf" && { mimeType: "application/pdf" }),
    ...(group && { groupName: group }),
  };
  const [files, total, groups] = await Promise.all([
    db.mediaFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { lessons: true } } },
    }),
    db.mediaFile.count({ where }),
    db.mediaFile.findMany({
      where: { ownerId: user.id, groupName: { not: null } },
      distinct: ["groupName"],
      select: { groupName: true },
      orderBy: { groupName: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="مكتبة الوسائط"
        description="صورك وملفات PDF التي ترفقها بالدروس"
        icon={<ImageIcon className="h-6 w-6" />}
        actions={editable && <UploadDialog />}
      />
      <SearchBar placeholder="ابحث باسم الملف..." defaultValue={q} label="البحث في الملفات">
        <FilterSelect
          name="type"
          label="نوع الملف"
          allLabel="كل الأنواع"
          defaultValue={type}
          options={[
            { value: "image", label: "صور" },
            { value: "pdf", label: "PDF" },
          ]}
        />
        <FilterSelect
          name="group"
          label="المجموعة"
          allLabel="كل المجموعات"
          defaultValue={group}
          options={groups.map((g) => ({ value: g.groupName!, label: g.groupName! }))}
        />
      </SearchBar>
      <div className="card p-4">
        {files.length === 0 ? (
          <EmptyState icon={<ImageIcon className="h-7 w-7" />} title={q || type || group ? "لا توجد نتائج" : "لا توجد ملفات بعد"} />
        ) : (
          <>
            <ul className="space-y-3">
              {files.map((f) => {
                const url = `/files/${f.storedName}`;
                const isImage = f.mimeType.startsWith("image/");
                return (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3 sm:flex-nowrap">
                    {isImage ? (
                      <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-surface object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                        <FileText className="h-6 w-6" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold" dir="auto">
                        {f.originalName}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                        <span>{formatSize(f.size)}</span>
                        <span>{isImage ? "صورة" : "PDF"}</span>
                        <span>{formatDate(f.createdAt)}</span>
                        {f._count.lessons > 0 && <span>مرفق بـ {formatNumber(f._count.lessons)} درس</span>}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {f.isPublic ? (
                          <Badge tone="green">
                            <Globe className="h-3 w-3" /> عام
                          </Badge>
                        ) : (
                          <Badge tone="gray">
                            <Lock className="h-3 w-3" /> خاص
                          </Badge>
                        )}
                        {f.groupName && <Badge tone="purple">{f.groupName}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-grid h-9 w-9 place-items-center rounded-lg hover:bg-surface"
                        title="معاينة"
                        aria-label="معاينة"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <CopyButton text={url} absolute />
                      {editable && (
                        <>
                          <ActionButton action={toggleMediaPublic.bind(null, f.id)}>{f.isPublic ? "جعله خاصاً" : "جعله عاماً"}</ActionButton>
                          <FormDialog
                            title="تعديل الملف"
                            action={updateMedia.bind(null, f.id)}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="تعديل">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          >
                            <TextField name="originalName" label="اسم الملف" required defaultValue={f.originalName} />
                            <TextField name="groupName" label="المجموعة" defaultValue={f.groupName ?? ""} />
                          </FormDialog>
                          <ConfirmAction
                            title="حذف الملف"
                            message={`حذف "${f.originalName}" نهائياً؟ ستتوقف روابطه عن العمل.`}
                            action={deleteMedia.bind(null, f.id)}
                            confirmLabel="حذف"
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="حذف" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/teacher/media" />
          </>
        )}
      </div>
    </>
  );
}
