import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeDollarSign, CalendarDays, CheckCircle2, FileText, Info, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { invoiceView, INVOICE_LABELS } from "@/lib/domain/invoices";
import { formatDate, formatIQD, formatNumber } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceDetailsDialog } from "@/components/invoices/invoice-details-dialog";

export const metadata: Metadata = { title: "الفواتير" };

export default async function TeacherInvoicesPage() {
  const user = await requireTeacher();
  const settings = await getSettings();
  const invoices = await db.teacherInvoice.findMany({
    where: { teacherId: user.id, status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const views = invoices.map((i) => ({ inv: i, view: invoiceView(i, now) }));
  const paid = views.filter((v) => v.view === "PAID").length;
  const overdue = views.filter((v) => v.view === "OVERDUE");

  return (
    <>
      <PageHeader
        title="الفواتير"
        description="فواتير اشتراكك في المنصة، مرتبة حسب تاريخ الإنشاء"
        icon={<BadgeDollarSign className="h-6 w-6" />}
        actions={
          <Link href="/teacher/invoices" className={buttonClass("secondary")}>
            <RefreshCw className="h-4 w-4" /> تحديث
          </Link>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي الفواتير" value={formatNumber(invoices.length)} icon={<FileText className="h-6 w-6" />} tone="blue" />
        <StatCard label="الفواتير المدفوعة" value={formatNumber(paid)} icon={<CheckCircle2 className="h-6 w-6" />} />
        <StatCard label="الفواتير المتأخرة" value={formatNumber(overdue.length)} icon={<AlertTriangle className="h-6 w-6" />} tone="red" />
      </div>

      {overdue.length > 0 && (
        <Alert tone="warning" title="لديك فواتير متأخرة" className="mb-5">
          يُوقف الحساب تلقائياً بعد {settings.graceDays} أيام من تاريخ الاستحقاق. {settings.paymentInstructions}
        </Alert>
      )}

      {invoices.length === 0 ? (
        <div className="card">
          <EmptyState title="لا توجد فواتير بعد" description="ستظهر هنا فواتير اشتراكك عندما تصدرها الإدارة" />
        </div>
      ) : (
        <div className="space-y-4">
          {views.map(({ inv, view }) => (
            <article key={inv.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    فاتورة {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    <span dir="ltr">{inv.number}</span> · أُنشئت في {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <InvoiceStatusBadge view={view} />
                  <span className="text-lg font-extrabold">{formatIQD(inv.amount)}</span>
                </div>
              </div>
              {inv.notes && (
                <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm">
                  <b>ملاحظات:</b> {inv.notes}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <CalendarDays className="h-4 w-4" />
                  {view === "PAID" ? `دُفعت في ${formatDate(inv.paidAt)}` : `تاريخ الاستحقاق ${formatDate(inv.dueDate)}`}
                </p>
                <InvoiceDetailsDialog
                  title={`الفاتورة ${inv.number}`}
                  rows={[
                    { label: "الحالة", value: INVOICE_LABELS[view] },
                    { label: "المبلغ", value: formatIQD(inv.amount) },
                    { label: "بداية الفترة", value: formatDate(inv.periodStart) },
                    { label: "نهاية الفترة", value: formatDate(inv.periodEnd) },
                    { label: "تاريخ الاستحقاق", value: formatDate(inv.dueDate) },
                    ...(inv.paidAt ? [{ label: "تاريخ الدفع", value: formatDate(inv.paidAt) }] : []),
                    ...(inv.paymentNote ? [{ label: "طريقة الدفع", value: inv.paymentNote }] : []),
                  ]}
                  instructions={view === "PAID" || view === "CANCELLED" ? undefined : settings.paymentInstructions}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
        <Info className="h-3.5 w-3.5" /> للاستفسار عن الفواتير تواصل مع إدارة المنصة.
      </p>
    </>
  );
}
