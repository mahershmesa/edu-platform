/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { ExternalLink, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { Table } from "@/components/ui/table";
import { BannerFields } from "./banner-fields";
import { createBanner, deleteBanner, toggleBanner, updateBanner } from "./actions";

export const metadata: Metadata = { title: "الإعلانات" };

function liveState(b: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  if (!b.isActive) return { label: "مخفي", tone: "gray" as const };
  if (b.startsAt && b.startsAt > now) return { label: "مجدول", tone: "blue" as const };
  if (b.endsAt && b.endsAt < now) return { label: "انتهى", tone: "amber" as const };
  return { label: "يُعرض الآن", tone: "green" as const };
}

export default async function BannersPage() {
  const user = await requirePermission("ads.read");
  const canWrite = can(user, "ads.write");
  const canDelete = can(user, "ads.delete");
  const banners = await db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const now = new Date();

  return (
    <>
      <PageHeader
        title="إعلانات الصفحة الرئيسية"
        description="الصور المتحركة أعلى الصفحة الرئيسية للموقع"
        icon={<Layers className="h-6 w-6" />}
        actions={
          canWrite && (
            <FormDialog
              title="إضافة إعلان"
              action={createBanner}
              size="lg"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة إعلان
                </Button>
              }
            >
              <BannerFields />
            </FormDialog>
          )
        }
      />
      <div className="card p-4">
        {banners.length === 0 ? (
          <EmptyState icon={<Layers className="h-7 w-7" />} title="لا توجد إعلانات" description="أضف صورة لتظهر في الصفحة الرئيسية" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>الصورة</th>
                <th>العنوان والوصف</th>
                <th>الرابط</th>
                <th>فترة العرض</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => {
                const st = liveState(b, now);
                return (
                  <tr key={b.id}>
                    <td>
                      <img src={b.imageUrl} alt={b.title ?? ""} className="h-14 w-32 rounded-lg bg-surface object-cover" />
                    </td>
                    <td className="min-w-48">
                      <p className="font-semibold">{b.title || "—"}</p>
                      {b.description && <p className="line-clamp-2 text-xs text-muted">{b.description}</p>}
                    </td>
                    <td className="max-w-48">
                      {b.link ? (
                        <a href={b.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 truncate text-sky-700 hover:underline" dir="ltr">
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{b.link}</span>
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-xs whitespace-nowrap text-muted">
                      {b.startsAt || b.endsAt ? `${formatShortDate(b.startsAt)} ← ${formatShortDate(b.endsAt)}` : "دائم"}
                    </td>
                    <td className="tabular-nums">{b.sortOrder}</td>
                    <td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {canWrite && (
                          <>
                            <ActionButton action={toggleBanner.bind(null, b.id)}>{b.isActive ? "إخفاء" : "تفعيل"}</ActionButton>
                            <FormDialog
                              title="تعديل الإعلان"
                              action={updateBanner.bind(null, b.id)}
                              size="lg"
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="تعديل">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              }
                            >
                              <BannerFields banner={b} />
                            </FormDialog>
                          </>
                        )}
                        {canDelete && (
                          <ConfirmAction
                            title="حذف الإعلان"
                            message="حذف هذا الإعلان نهائياً؟"
                            action={deleteBanner.bind(null, b.id)}
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
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
