import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Ban, BookOpen, CheckCircle2, GraduationCap, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone, normalizeIraqiPhone } from "@/lib/phone";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { PasswordFields } from "@/components/admin-users/password-fields";
import { UserStatusBadge } from "@/components/admin-users/status-badge";
import { StudentFields } from "./student-fields";
import { DetailsDialog } from "./student-details";
import { changeStudentPassword, createStudent, resetStudentDevices, setStudentStatus, updateStudent } from "./actions";

export const metadata: Metadata = { title: "الطلاب" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("students.read");
  const params = await searchParams;
  const q = sp(params, "q");
  const status = sp(params, "status");
  const page = pageFrom(params);
  const canWrite = can(user, "students.write");
  const canPassword = can(user, "students.change_password");
  const canDevices = can(user, "students.reset_devices");

  const phoneQ = q ? normalizeIraqiPhone(q) : null;
  const where: Prisma.UserWhereInput = {
    type: "STUDENT",
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: phoneQ ?? q.replace(/^0/, "") } },
      ],
    }),
    ...(status === "ACTIVE" || status === "SUSPENDED" ? { status } : {}),
  };
  const [total, students] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        devices: { orderBy: { lastSeenAt: "desc" } },
        enrollments: {
          orderBy: { createdAt: "desc" },
          include: { course: { select: { title: true, teacher: { select: { name: true } } } } },
        },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="إدارة الطلاب"
        description="عرض جميع الطلاب المسجلين وإدارة حساباتهم وأجهزتهم"
        icon={<GraduationCap className="h-6 w-6" />}
        actions={
          canWrite && (
            <FormDialog
              title="إضافة طالب"
              action={createStudent}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> إضافة طالب
                </Button>
              }
            >
              <StudentFields />
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
            { value: "ACTIVE", label: "نشط" },
            { value: "SUSPENDED", label: "موقوف" },
          ]}
        />
      </SearchBar>

      <div className="card p-4">
        {students.length === 0 ? (
          <EmptyState title={q || status ? "لا توجد نتائج" : "لا يوجد طلاب بعد"} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>الهاتف / البريد</th>
                  <th>الحالة</th>
                  <th>الاشتراكات</th>
                  <th>الأجهزة</th>
                  <th>تاريخ التسجيل</th>
                  <th>آخر دخول</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const active = s.enrollments.filter((e) => e.status === "ACTIVE").length;
                  return (
                    <tr key={s.id} className={s.status === "SUSPENDED" ? "bg-amber-50/50" : undefined}>
                      <td className="font-semibold">
                        {s.name}
                        {s.governorate && <span className="block text-xs font-normal text-muted">{s.governorate}</span>}
                      </td>
                      <td dir="ltr" className="text-right text-muted">
                        {s.phone && <span className="block whitespace-nowrap">{displayPhone(s.phone)}</span>}
                        {s.email && <span className="block">{s.email}</span>}
                      </td>
                      <td>
                        <UserStatusBadge status={s.status} />
                      </td>
                      <td>{active ? <Badge tone="green">{formatNumber(active)} دورة</Badge> : <Badge>بدون اشتراك</Badge>}</td>
                      <td className="tabular-nums">{formatNumber(s.devices.length)}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(s.createdAt)}</td>
                      <td className="whitespace-nowrap text-muted">{formatDateTime(s.lastLoginAt)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <DetailsDialog title={`اشتراكات ${s.name}`} label="الاشتراكات" icon="none">
                            {s.enrollments.length === 0 ? (
                              <EmptyState icon={<BookOpen className="h-6 w-6" />} title="لا توجد اشتراكات" />
                            ) : (
                              <ul className="space-y-2">
                                {s.enrollments.map((e) => (
                                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
                                    <div>
                                      <p className="font-semibold">{e.course.title}</p>
                                      <p className="text-xs text-muted">
                                        {e.course.teacher.name} · {formatDate(e.createdAt)}
                                      </p>
                                    </div>
                                    {e.status === "ACTIVE" ? <Badge tone="green">نشط</Badge> : <Badge tone="red">ملغى</Badge>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </DetailsDialog>
                          <DetailsDialog title={`أجهزة ${s.name}`} label="الأجهزة">
                            {s.devices.length === 0 ? (
                              <EmptyState title="لا توجد أجهزة مسجلة" />
                            ) : (
                              <div className="space-y-3">
                                <ul className="space-y-2">
                                  {s.devices.map((d) => (
                                    <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
                                      <div>
                                        <p className="font-semibold">{d.label}</p>
                                        <p className="text-xs text-muted">
                                          أول دخول {formatDate(d.createdAt)} · آخر نشاط {formatDateTime(d.lastSeenAt)}
                                        </p>
                                      </div>
                                      {canDevices && (
                                        <ConfirmAction
                                          title="حذف الجهاز"
                                          message="سيتم تسجيل خروج الطالب من هذا الجهاز ويمكنه الدخول من جهاز جديد."
                                          action={resetStudentDevices.bind(null, s.id, d.id)}
                                          confirmLabel="حذف"
                                          trigger={
                                            <Button variant="ghost" size="icon" aria-label="حذف الجهاز" className="text-red-600">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          }
                                        />
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {canDevices && (
                                  <ConfirmAction
                                    title="إعادة تعيين كل الأجهزة"
                                    message="سيتم تسجيل خروج الطالب من كل الأجهزة."
                                    action={resetStudentDevices.bind(null, s.id, null)}
                                    confirmLabel="إعادة التعيين"
                                    trigger={<Button variant="danger">إعادة تعيين كل الأجهزة</Button>}
                                  />
                                )}
                              </div>
                            )}
                          </DetailsDialog>
                          {canWrite && (
                            <FormDialog
                              title={`تعديل: ${s.name}`}
                              action={updateStudent.bind(null, s.id)}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="تعديل" title="تعديل">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              }
                            >
                              <StudentFields student={s} />
                            </FormDialog>
                          )}
                          {canPassword && (
                            <FormDialog
                              title={`تغيير كلمة مرور: ${s.name}`}
                              action={changeStudentPassword.bind(null, s.id)}
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
                          )}
                          {canWrite && (
                            <ConfirmAction
                              title={s.status === "ACTIVE" ? "إيقاف الطالب" : "تفعيل الطالب"}
                              message={
                                s.status === "ACTIVE"
                                  ? `سيتم تسجيل خروج ${s.name} ولن يتمكن من الدخول حتى يُفعَّل.`
                                  : `سيتمكن ${s.name} من الدخول مجدداً.`
                              }
                              action={setStudentStatus.bind(null, s.id, s.status === "ACTIVE")}
                              confirmLabel={s.status === "ACTIVE" ? "إيقاف" : "تفعيل"}
                              danger={s.status === "ACTIVE"}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="إيقاف/تفعيل" title={s.status === "ACTIVE" ? "إيقاف" : "تفعيل"}>
                                  {s.status === "ACTIVE" ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-brand-600" />}
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
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/admin/students" />
          </>
        )}
      </div>
    </>
  );
}
