import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { AlertTriangle, BadgeDollarSign, Ban, CheckCircle2, Pencil, Plus, Send, Trash2, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { invoiceView, INVOICE_LABELS } from "@/lib/domain/invoices";
import { formatIQD, formatNumber, formatShortDate } from "@/lib/format";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { invoiceViewWhere } from "@/server/invoices";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FilterSelect, SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { Table } from "@/components/ui/table";
import { TextField } from "@/components/ui/field";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceFields } from "./invoice-fields";
import { cancelInvoice, createInvoice, deleteInvoice, markInvoicePaid, sendInvoice, updateInvoice } from "./actions";

const sumIQD = (n: number | null) => `${formatNumber(n ?? 0)} د.ع`;

export const metadata: Metadata = { title: "فواتير المعلمين" };

export default async function AdminInvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("bills.read");
  const params = await searchParams;
  const q = sp(params, "q");
  const teacherId = sp(params, "teacherId");
  const status = sp(params, "status");
  const page = pageFrom(params);
  const canWrite = can(user, "bills.write");
  const now = new Date();

  const where: Prisma.TeacherInvoiceWhereInput = {
    ...(teacherId && { teacherId }),
    ...invoiceViewWhere(status, now),
    ...(q && {
      OR: [
        { number: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { teacher: { name: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [teachers, invoices, total, overdue, dueSum, paidSum] = await Promise.all([
    db.user.findMany({ where: { type: "TEACHER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.teacherInvoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { teacher: { select: { id: true, name: true } } },
    }),
    db.teacherInvoice.count({ where }),
    db.teacherInvoice.count({ where: invoiceViewWhere("OVERDUE", now) }),
    db.teacherInvoice.aggregate({ where: { status: "DUE" }, _sum: { amount: true } }),
    db.teacherInvoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="فواتير المعلمين"
        description="إدارة اشتراكات المعلمين المدفوعة للمنصة وتسجيل الدفعات"
        icon={<BadgeDollarSign className="h-6 w-6" />}
        actions={
          canWrite && (
            <FormDialog
              title="إنشاء فاتورة جديدة"
              action={createInvoice}
              submitLabel="إنشاء الفاتورة"
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> فاتورة جديدة
                </Button>
              }
            >
              <InvoiceFields teachers={teachers} />
            </FormDialog>
          )
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="مبالغ مستحقة غير مدفوعة" value={sumIQD(dueSum._sum.amount)} icon={<Wallet className="h-6 w-6" />} tone="blue" />
        <StatCard label="فواتير متأخرة" value={formatNumber(overdue)} icon={<AlertTriangle className="h-6 w-6" />} tone="red" />
        <StatCard label="إجمالي المدفوع" value={sumIQD(paidSum._sum.amount)} icon={<CheckCircle2 className="h-6 w-6" />} />
      </div>

      <SearchBar placeholder="ابحث برقم الفاتورة أو اسم المعلم أو الملاحظات..." defaultValue={q} label="البحث في الفواتير">
        <FilterSelect name="teacherId" label="المعلم" allLabel="جميع المعلمين" defaultValue={teacherId} options={teachers.map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect
          name="status"
          label="الحالة"
          allLabel="جميع الحالات"
          defaultValue={status}
          options={(["DRAFT", "DUE", "OVERDUE", "PAID", "CANCELLED"] as const).map((s) => ({ value: s, label: INVOICE_LABELS[s] }))}
        />
      </SearchBar>

      <div className="card p-4">
        {invoices.length === 0 ? (
          <EmptyState title="لا توجد فواتير" description={q || teacherId || status ? "غيّر البحث أو التصفية" : "أنشئ أول فاتورة لمعلم"} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>المعلم</th>
                  <th>الفترة</th>
                  <th>المبلغ</th>
                  <th>الاستحقاق</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const view = invoiceView(inv, now);
                  const open = inv.status === "DRAFT" || inv.status === "DUE";
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs font-semibold" dir="ltr">
                        {inv.number}
                      </td>
                      <td>
                        <p className="font-semibold">{inv.teacher.name}</p>
                        {inv.notes && <p className="max-w-56 truncate text-xs text-muted">{inv.notes}</p>}
                      </td>
                      <td className="text-xs whitespace-nowrap text-muted">
                        من {formatShortDate(inv.periodStart)}
                        <br />
                        إلى {formatShortDate(inv.periodEnd)}
                      </td>
                      <td className="font-semibold whitespace-nowrap">{formatIQD(inv.amount)}</td>
                      <td className="whitespace-nowrap">{formatShortDate(inv.dueDate)}</td>
                      <td>
                        <InvoiceStatusBadge view={view} />
                        {inv.paidAt && <p className="mt-1 text-[11px] text-muted">دُفعت {formatShortDate(inv.paidAt)}</p>}
                        {inv.paymentNote && <p className="text-[11px] text-muted">{inv.paymentNote}</p>}
                      </td>
                      <td>
                        {canWrite && (
                          <div className="flex flex-wrap items-center gap-1">
                            {inv.status === "DRAFT" && (
                              <ConfirmAction
                                title="إرسال الفاتورة"
                                message={`ستصبح الفاتورة ${inv.number} مستحقة وتظهر للمعلم.`}
                                action={sendInvoice.bind(null, inv.id)}
                                confirmLabel="إرسال"
                                danger={false}
                                trigger={
                                  <Button variant="ghost" size="icon" title="إرسال للمعلم" aria-label="إرسال للمعلم">
                                    <Send className="h-4 w-4 text-sky-600" />
                                  </Button>
                                }
                              />
                            )}
                            {open && (
                              <FormDialog
                                title={`تسجيل دفع ${inv.number}`}
                                description={`${inv.teacher.name} · ${formatIQD(inv.amount)}`}
                                action={markInvoicePaid.bind(null, inv.id)}
                                submitLabel="تأكيد الدفع"
                                size="sm"
                                trigger={
                                  <Button variant="ghost" size="icon" title="تسجيل الدفع" aria-label="تسجيل الدفع">
                                    <CheckCircle2 className="h-4 w-4 text-brand-600" />
                                  </Button>
                                }
                              >
                                <TextField name="paidAt" label="تاريخ الدفع" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                                <TextField name="paymentNote" label="طريقة الدفع / ملاحظة" placeholder="نقداً، زين كاش، تحويل..." />
                              </FormDialog>
                            )}
                            {open && (
                              <FormDialog
                                title={`تعديل ${inv.number}`}
                                action={updateInvoice.bind(null, inv.id)}
                                trigger={
                                  <Button variant="ghost" size="icon" title="تعديل" aria-label="تعديل">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                }
                              >
                                <InvoiceFields invoice={inv} />
                              </FormDialog>
                            )}
                            {inv.status === "DUE" && (
                              <ConfirmAction
                                title="إلغاء الفاتورة"
                                message={`إلغاء الفاتورة ${inv.number}؟ لن تُحسب على المعلم.`}
                                action={cancelInvoice.bind(null, inv.id)}
                                confirmLabel="إلغاء الفاتورة"
                                trigger={
                                  <Button variant="ghost" size="icon" title="إلغاء" aria-label="إلغاء">
                                    <Ban className="h-4 w-4 text-amber-600" />
                                  </Button>
                                }
                              />
                            )}
                            {inv.status === "DRAFT" && (
                              <ConfirmAction
                                title="حذف المسودة"
                                message={`حذف المسودة ${inv.number} نهائياً؟`}
                                action={deleteInvoice.bind(null, inv.id)}
                                confirmLabel="حذف"
                                trigger={
                                  <Button variant="ghost" size="icon" title="حذف" aria-label="حذف" className="text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/admin/invoices" />
          </>
        )}
      </div>
    </>
  );
}
