import type { Metadata } from "next";
import { Ban, CheckCircle2, KeyRound, Pencil, Plus, UserCog } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PasswordFields } from "@/components/admin-users/password-fields";
import { UserStatusBadge } from "@/components/admin-users/status-badge";
import { StaffFields } from "./staff-fields";
import { changeStaffPassword, createStaff, setStaffStatus, updateStaff } from "./actions";

export const metadata: Metadata = { title: "الموظفون" };

export default async function StaffPage() {
  const user = await requirePermission("staff.read");
  const canWrite = can(user, "staff.write");
  const [admins, staff, roles] = await Promise.all([
    db.user.findMany({ where: { type: "ADMIN" }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { type: "STAFF" }, orderBy: { createdAt: "desc" }, include: { role: true } }),
    db.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }], select: { id: true, name: true, isActive: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="موظفو الإدارة"
        description="إنشاء حسابات موظفي لوحة التحكم وتعيين أدوارهم"
        icon={<UserCog className="h-6 w-6" />}
        actions={
          canWrite && (
            <FormDialog
              title="إنشاء موظف إدارة"
              action={createStaff}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> موظف جديد
                </Button>
              }
            >
              <StaffFields roles={roles} />
            </FormDialog>
          )
        }
      />
      <div className="card p-4">
        <Table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>نوع الحساب</th>
              <th>الدور المخصص</th>
              <th>الحالة</th>
              <th>آخر دخول</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td className="font-semibold">{a.name}</td>
                <td dir="ltr" className="text-right text-muted">
                  {a.email ?? "—"}
                </td>
                <td>
                  <Badge tone="green">مدير نظام</Badge>
                </td>
                <td className="text-muted">كل الصلاحيات</td>
                <td>
                  <UserStatusBadge status={a.status} />
                </td>
                <td className="whitespace-nowrap text-muted">{formatDateTime(a.lastLoginAt)}</td>
                <td className="text-xs text-muted">—</td>
              </tr>
            ))}
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="font-semibold">{s.name}</td>
                <td dir="ltr" className="text-right text-muted">
                  {s.email ?? "—"}
                </td>
                <td>
                  <Badge tone="blue">موظف إدارة</Badge>
                </td>
                <td>
                  {s.role ? (
                    <span className={s.role.isActive ? "" : "text-muted line-through"}>{s.role.name}</span>
                  ) : (
                    <span className="text-red-600">بدون دور</span>
                  )}
                </td>
                <td>
                  <UserStatusBadge status={s.status} />
                </td>
                <td className="whitespace-nowrap text-muted">{formatDateTime(s.lastLoginAt)}</td>
                <td>
                  {canWrite && (
                    <div className="flex items-center gap-1">
                      <FormDialog
                        title={`تعديل: ${s.name}`}
                        action={updateStaff.bind(null, s.id)}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="تعديل" title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <StaffFields staff={s} roles={roles} />
                      </FormDialog>
                      <FormDialog
                        title={`تغيير كلمة مرور: ${s.name}`}
                        action={changeStaffPassword.bind(null, s.id)}
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
                      {s.id !== user.id && (
                        <ConfirmAction
                          title={s.status === "ACTIVE" ? "إيقاف الموظف" : "تفعيل الموظف"}
                          message={s.status === "ACTIVE" ? `سيتم تسجيل خروج ${s.name} ومنعه من الدخول.` : `سيتمكن ${s.name} من الدخول مجدداً.`}
                          action={setStaffStatus.bind(null, s.id, s.status === "ACTIVE")}
                          confirmLabel={s.status === "ACTIVE" ? "إيقاف" : "تفعيل"}
                          danger={s.status === "ACTIVE"}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="إيقاف/تفعيل">
                              {s.status === "ACTIVE" ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-brand-600" />}
                            </Button>
                          }
                        />
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {staff.length === 0 && <EmptyState title="لا يوجد موظفون بعد" description="أضف موظفاً وحدد دوره ليصل إلى أقسام محددة فقط" />}
      </div>
    </>
  );
}
