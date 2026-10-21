import type { Metadata } from "next";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { RoleFields } from "./role-fields";
import { createRole, deleteRole, updateRole } from "./actions";

export const metadata: Metadata = { title: "الأدوار والصلاحيات" };

export default async function RolesPage() {
  await requireSystemAdmin();
  const roles = await db.role.findMany({
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    include: { permissions: true, _count: { select: { users: true } } },
  });

  return (
    <>
      <PageHeader
        title="الأدوار والصلاحيات"
        description="إدارة أدوار موظفي لوحة التحكم — متاح لمدير النظام فقط"
        icon={<Shield className="h-6 w-6" />}
        actions={
          <FormDialog
            title="إنشاء دور"
            action={createRole}
            size="lg"
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> دور جديد
              </Button>
            }
          >
            <RoleFields />
          </FormDialog>
        }
      />
      <div className="card p-4">
        {roles.length === 0 ? (
          <EmptyState title="لا توجد أدوار" description="شغّل seed لإنشاء الأدوار النظامية" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>المعرّف</th>
                <th>الصلاحيات</th>
                <th>المستخدمون</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-semibold">{r.name}</p>
                    {r.description && <p className="text-xs text-muted">{r.description}</p>}
                  </td>
                  <td className="font-mono text-xs" dir="ltr">
                    {r.slug}
                  </td>
                  <td>
                    <Badge>{formatNumber(r.permissions.length)}</Badge>
                  </td>
                  <td className="tabular-nums">{formatNumber(r._count.users)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {r.isSystem && <Badge tone="green">نظامي</Badge>}
                      {r.isActive ? <Badge>نشط</Badge> : <Badge tone="amber">معطّل</Badge>}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <FormDialog
                        title={`تعديل الدور: ${r.name}`}
                        action={updateRole.bind(null, r.id)}
                        size="lg"
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="تعديل" title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <RoleFields role={r} permissions={r.permissions.map((p) => p.permission)} />
                      </FormDialog>
                      {!r.isSystem && (
                        <ConfirmAction
                          title="حذف الدور"
                          message={`حذف الدور "${r.name}"؟ لا يمكن حذف دور مسند إلى موظفين.`}
                          action={deleteRole.bind(null, r.id)}
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
        )}
      </div>
    </>
  );
}
