import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Users, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { blocksTeacher, invoiceView } from "@/lib/domain/invoices";
import { formatNumber, formatShortDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Table } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { setManualSuspension, syncAllAction } from "./actions";

export const metadata: Metadata = { title: "حالة المعلمين" };

export default async function TeacherStatusPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("teacher_status.read");
  const params = await searchParams;
  const filter = sp(params, "filter");
  const canWrite = can(user, "teacher_status.write");
  const { graceDays } = await getSettings();
  const now = new Date();

  const teachers = await db.user.findMany({
    where: { type: "TEACHER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      manualSuspended: true,
      billingSuspended: true,
      invoices: { where: { status: "DUE" }, select: { id: true, number: true, amount: true, dueDate: true, status: true }, orderBy: { dueDate: "asc" } },
    },
  });

  const rows = teachers.map((t) => {
    const overdue = t.invoices.filter((i) => invoiceView(i, now) === "OVERDUE");
    const blocking = t.invoices.filter((i) => blocksTeacher(i, graceDays, now));
    const suspended = t.manualSuspended || t.billingSuspended || t.status === "SUSPENDED";
    const outOfSync = blocking.length > 0 !== t.billingSuspended;
    return { ...t, overdue, blocking, suspended, outOfSync, overdueAmount: overdue.reduce((n, i) => n + i.amount, 0) };
  });
  const shown = rows.filter((r) => (filter === "suspended" ? r.suspended : filter === "active" ? !r.suspended : filter === "overdue" ? r.overdue.length > 0 : true));
  const outOfSync = rows.filter((r) => r.outOfSync).length;

  return (
    <>
      <PageHeader
        title="إدارة حالة المعلمين"
        description={`يُوقف حساب المعلم تلقائياً إذا تجاوزت فاتورته المستحقة ${graceDays} أيام بعد تاريخ الاستحقاق، ويُعاد تفعيله عند الدفع`}
        icon={<Activity className="h-6 w-6" />}
        actions={
          <>
            <Link href="/admin/teacher-status" className={buttonClass("secondary")}>
              <RefreshCw className="h-4 w-4" /> تحديث
            </Link>
            {canWrite && (
              <ActionButton action={syncAllAction} variant="primary" size="md">
                <RefreshCw className="h-4 w-4" /> مزامنة جميع الحالات
              </ActionButton>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي المعلمين" value={formatNumber(rows.length)} icon={<Users className="h-6 w-6" />} tone="blue" />
        <StatCard label="المعلمون النشطون" value={formatNumber(rows.filter((r) => !r.suspended).length)} icon={<CheckCircle2 className="h-6 w-6" />} />
        <StatCard label="المعلمون الموقوفون" value={formatNumber(rows.filter((r) => r.suspended).length)} icon={<XCircle className="h-6 w-6" />} tone="red" />
        <StatCard
          label="فواتير متأخرة"
          value={formatNumber(rows.reduce((n, r) => n + r.overdue.length, 0))}
          icon={<AlertTriangle className="h-6 w-6" />}
          tone="amber"
        />
      </div>

      {outOfSync > 0 && (
        <Alert tone="warning" className="mb-5">
          {outOfSync} معلم حالته غير محدّثة حسب الفواتير. اضغط &quot;مزامنة جميع الحالات&quot; لتطبيق القاعدة الآن (تعمل تلقائياً يومياً).
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["", "الكل"],
          ["active", "النشطون"],
          ["suspended", "الموقوفون"],
          ["overdue", "لديهم فواتير متأخرة"],
        ].map(([v, label]) => (
          <Link
            key={v}
            href={v ? `/admin/teacher-status?filter=${v}` : "/admin/teacher-status"}
            className={buttonClass(filter === v ? "primary" : "secondary", "sm")}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="card p-4">
        {shown.length === 0 ? (
          <EmptyState title="لا يوجد معلمون في هذا التصنيف" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>المعلم</th>
                <th>الحالة</th>
                <th>السبب</th>
                <th>الفواتير المتأخرة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/teachers/${r.id}`} className="font-semibold hover:underline">
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted" dir="ltr">
                      {r.email ?? r.phone ?? ""}
                    </p>
                  </td>
                  <td>
                    <Badge tone={r.suspended ? "red" : "green"}>{r.suspended ? "موقوف" : "نشط"}</Badge>
                    {r.outOfSync && <p className="mt-1 text-[11px] text-amber-700">بانتظار المزامنة</p>}
                  </td>
                  <td className="text-xs">
                    <ul className="space-y-0.5">
                      {r.manualSuspended && <li>إيقاف يدوي من الإدارة</li>}
                      {r.billingSuspended && <li>فاتورة متأخرة بعد مهلة السماح</li>}
                      {r.status === "SUSPENDED" && <li>الحساب موقوف من صفحة المعلمين</li>}
                      {!r.suspended && <li className="text-muted">—</li>}
                    </ul>
                  </td>
                  <td className="text-xs">
                    {r.overdue.length === 0 ? (
                      <span className="text-muted">لا يوجد</span>
                    ) : (
                      <>
                        <p className="font-semibold text-red-700">
                          {formatNumber(r.overdue.length)} فاتورة · {formatNumber(r.overdueAmount)} د.ع
                        </p>
                        <p className="text-muted">أقدم استحقاق: {formatShortDate(r.overdue[0].dueDate)}</p>
                      </>
                    )}
                  </td>
                  <td>
                    {canWrite &&
                      (r.manualSuspended ? (
                        <ActionButton action={setManualSuspension.bind(null, r.id, false)} variant="secondary">
                          <CheckCircle2 className="h-3.5 w-3.5" /> إلغاء الإيقاف اليدوي
                        </ActionButton>
                      ) : (
                        <ConfirmAction
                          title="إيقاف المعلم يدوياً"
                          message={`لن يستطيع ${r.name} إضافة أو تعديل المحتوى والأكواد حتى تُلغي الإيقاف. طلابه الحاليون يستمرون في المشاهدة.`}
                          action={setManualSuspension.bind(null, r.id, true)}
                          confirmLabel="إيقاف"
                          trigger={
                            <Button variant="danger" size="sm">
                              <XCircle className="h-3.5 w-3.5" /> إيقاف يدوي
                            </Button>
                          }
                        />
                      ))}
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
