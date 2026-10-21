import type { InvoiceStatus } from "@prisma/client";

export type InvoiceView = "DRAFT" | "DUE" | "OVERDUE" | "PAID" | "CANCELLED";

const DAY = 24 * 60 * 60 * 1000;

/** DUE invoices past their due date are shown as OVERDUE. */
export function invoiceView(inv: { status: InvoiceStatus; dueDate: Date }, now = new Date()): InvoiceView {
  if (inv.status === "DUE" && inv.dueDate.getTime() < startOfDay(now).getTime()) return "OVERDUE";
  return inv.status;
}

export const INVOICE_LABELS: Record<InvoiceView, string> = {
  DRAFT: "مسودة",
  DUE: "مستحقة",
  OVERDUE: "متأخرة",
  PAID: "مدفوعة",
  CANCELLED: "ملغاة",
};

/** An invoice blocks the teacher once it is DUE and more than `graceDays` past the due date. */
export function blocksTeacher(inv: { status: InvoiceStatus; dueDate: Date; amount: number }, graceDays: number, now = new Date()) {
  if (inv.status !== "DUE" || inv.amount <= 0) return false;
  return startOfDay(now).getTime() > inv.dueDate.getTime() + graceDays * DAY;
}

export function shouldBillingSuspend(
  invoices: { status: InvoiceStatus; dueDate: Date; amount: number }[],
  graceDays: number,
  now = new Date(),
): boolean {
  return invoices.some((i) => blocksTeacher(i, graceDays, now));
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function invoiceNumber(seq: number, date = new Date()): string {
  return `INV-${date.getFullYear()}-${String(seq).padStart(5, "0")}`;
}
