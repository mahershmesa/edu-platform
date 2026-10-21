import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Eye, KeyRound, MoreHorizontal, Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { PasswordFields } from "@/components/admin-users/password-fields";
import { TeacherFields } from "./teacher-fields";
import { changeTeacherPassword, createTeacher, deleteTeacher, setTeacherSuspended, updateTeacher } from "./actions";

export const metadata: Metadata = { title: "المعلمون" };

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("teachers.read");
  const params = await searchParams;
  const q = sp(params, "q");
  const status = sp(params, "status");
  const page = pageFrom(params);
  const canWrite = can(user, "teachers.write");
  const canDelete = can(user, "teachers.delete");

  const where: Prisma.UserWhereInput = {
    type: "TEACHER",
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q.replace(/^0/, "") } },
      ],
    }),
    ...(status === "active" && { status: "ACTIVE", manualSuspended: false, billingSuspended: false }),
    ...(status === "suspended" && { OR: [{ status: "SUSPENDED" }, { manualSuspended: true }, { billingSuspended: true }] }),
  };
  const [total, teachers] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { courses: true, invoices: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="إدارة المعلمين"
        description="إضافة وإدارة حسابات المعلمين في المنصة"
        icon={<Users className="h-6 w-6" />}
        actions={
          canWrite && (
            <FormDialog
              title="إضافة معلم"
              action={createTeacher}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة معلم
                </Button>
              }
            >
              <TeacherFields />
            </FormDialog>
          )
        }
      />
      <SearchBar placeholder="ابحث بالاسم أو البريد أو الهاتف..." defaultValue={q}>
        <FilterSelect
          name="status"
          label="الحالة"
          allLabel="كل الحالات"
          defaultValue={status}
          options={[
            { value: "active", label: "نشط" },
            { value: "suspended", label: "موقوف" },
          ]}
        />
      </SearchBar>

      <div className="card p-4">
        {teachers.length === 0 ? (
          <EmptyState title={q || status ? "لا توجد نتائج" : "لا يوجد معلمون بعد"} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>المعلم</th>
                  <th>البريد</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>تاريخ الانضمام</th>
                  <th>الدورات</th>
                  <th>الفواتير</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => {
                  const suspended = t.status === "SUSPENDED" || t.manualSuspended || t.billingSuspended;
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/admin/teachers/${t.id}`} className="flex items-center gap-3 font-semibold hover:text-brand-700">
                          <Avatar name={t.name} src={t.avatarUrl} size={36} />
                          {t.name}
                        </Link>
                      </td>
                      <td dir="ltr" className="text-right text-muted">
                        {t.email ?? "—"}
                      </td>
                      <td dir="ltr" className="text-right whitespace-nowrap text-muted">
                        {displayPhone(t.phone)}
                      </td>
                      <td>
                        {suspended ? (
                          <Badge tone="amber">{t.billingSuspended && !t.manualSuspended ? "موقوف (فاتورة)" : "موقوف"}</Badge>
                        ) : (
                          <Badge tone="green">نشط</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-muted">{formatDate(t.createdAt)}</td>
                      <td className="tabular-nums">{formatNumber(t._count.courses)}</td>
                      <td className="tabular-nums">{formatNumber(t._count.invoices)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/teachers/${t.id}`} className="rounded-lg p-2 text-muted hover:bg-surface" title="عرض">
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canWrite && (
                            <>
                              <FormDialog
                                title={`تعديل: ${t.name}`}
                                action={updateTeacher.bind(null, t.id)}
                                trigger={
                                  <Button variant="ghost" size="icon" aria-label="تعديل" title="تعديل">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                }
                              >
                                <TeacherFields teacher={t} />
                              </FormDialog>
                              <FormDialog
                                title={`تغيير كلمة مرور: ${t.name}`}
                                action={changeTeacherPassword.bind(null, t.id)}
                                submitLabel="تغيير"
                                size="sm"
                                trigger={
                                  <Button variant="ghost" size="icon" aria-label="تغيير كلمة المرور" title="تغيير كلمة المرور">
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                }
                              >
                                <PasswordFields />
                              </FormDialog>
                              <ConfirmAction
                                title={t.manualSuspended ? "تفعيل المعلم" : "إيقاف المعلم"}
                                message={
                                  t.manualSuspended
                                    ? `سيتمكن ${t.name} من إدارة محتواه مجدداً.`
                                    : `لن يتمكن ${t.name} من إضافة أو تعديل المحتوى والأكواد. طلابه الحاليون يستمرون في المشاهدة.`
                                }
                                action={setTeacherSuspended.bind(null, t.id, !t.manualSuspended)}
                                confirmLabel={t.manualSuspended ? "تفعيل" : "إيقاف"}
                                danger={!t.manualSuspended}
                                trigger={
                                  <Button variant="ghost" size="icon" aria-label="إيقاف/تفعيل" title={t.manualSuspended ? "تفعيل" : "إيقاف"}>
                                    <Power className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            </>
                          )}
                          {canDelete && (
                            <ConfirmAction
                              title="حذف المعلم"
                              message={`حذف حساب ${t.name} نهائياً؟ لا يمكن حذف معلم لديه دورات.`}
                              action={deleteTeacher.bind(null, t.id)}
                              confirmLabel="حذف"
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="حذف" title="حذف" className="text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          )}
                          {!canWrite && !canDelete && <MoreHorizontal className="h-4 w-4 text-muted" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/admin/teachers" />
          </>
        )}
      </div>
    </>
  );
}
