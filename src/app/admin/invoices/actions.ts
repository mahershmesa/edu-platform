"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { int, optStr, str } from "@/lib/utils";
import { createInvoiceWithNumber } from "@/server/invoices";
import { syncTeacherStatus } from "@/server/teacher-status";

const dateStr = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} مطلوب`)
    .transform((v) => new Date(`${v}T00:00:00+03:00`));

const schema = z
  .object({
    amount: z.number({ message: "أدخل المبلغ" }).int().min(0, "المبلغ لا يمكن أن يكون سالباً").max(1_000_000_000),
    periodStart: dateStr("بداية الفترة"),
    periodEnd: dateStr("نهاية الفترة"),
    dueDate: dateStr("تاريخ الاستحقاق"),
    notes: z.string().trim().max(500).nullable(),
  })
  .refine((d) => d.periodEnd > d.periodStart, { path: ["periodEnd"], message: "نهاية الفترة يجب أن تكون بعد بدايتها" });

function parse(form: FormData) {
  return schema.safeParse({
    amount: int(form, "amount") ?? undefined,
    periodStart: str(form, "periodStart"),
    periodEnd: str(form, "periodEnd"),
    dueDate: str(form, "dueDate"),
    notes: optStr(form, "notes"),
  });
}

function refresh() {
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/teacher-status");
  revalidatePath("/teacher/invoices");
  revalidatePath("/teacher");
}

export async function createInvoice(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("bills.write");
  const teacherId = str(form, "teacherId");
  const teacher = teacherId ? await db.user.findFirst({ where: { id: teacherId, type: "TEACHER" } }) : null;
  if (!teacher) return fail("تحقق من الحقول", { teacherId: "اختر المعلم" });
  const parsed = parse(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  const status = str(form, "status") === "DUE" ? "DUE" : "DRAFT";
  const inv = await createInvoiceWithNumber({ ...parsed.data, teacherId, status });
  await audit(user, "invoice.create", "TeacherInvoice", inv.id, { number: inv.number, amount: inv.amount });
  await syncTeacherStatus(teacherId);
  refresh();
  return done(`تم إنشاء الفاتورة ${inv.number}`);
}

export async function updateInvoice(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("bills.write");
  const inv = await db.teacherInvoice.findUnique({ where: { id } });
  if (!inv) return fail("الفاتورة غير موجودة");
  if (inv.status === "PAID" || inv.status === "CANCELLED") return fail("لا يمكن تعديل فاتورة مدفوعة أو ملغاة");
  const parsed = parse(form);
  if (!parsed.success) return zodFail(parsed.error.issues);
  await db.teacherInvoice.update({ where: { id }, data: parsed.data });
  await audit(user, "invoice.update", "TeacherInvoice", id);
  await syncTeacherStatus(inv.teacherId);
  refresh();
  return done("تم حفظ الفاتورة");
}

export async function sendInvoice(id: string): Promise<ActionState> {
  const user = await requirePermission("bills.write");
  const inv = await db.teacherInvoice.findUnique({ where: { id } });
  if (!inv || inv.status !== "DRAFT") return fail("يمكن إرسال المسودات فقط");
  await db.teacherInvoice.update({ where: { id }, data: { status: "DUE" } });
  await audit(user, "invoice.send", "TeacherInvoice", id);
  await syncTeacherStatus(inv.teacherId);
  refresh();
  return done("أُرسلت الفاتورة للمعلم");
}

export async function markInvoicePaid(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("bills.write");
  const inv = await db.teacherInvoice.findUnique({ where: { id } });
  if (!inv) return fail("الفاتورة غير موجودة");
  if (inv.status === "PAID" || inv.status === "CANCELLED") return fail("الفاتورة مدفوعة أو ملغاة مسبقاً");
  const paidStr = str(form, "paidAt");
  const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(paidStr) ? new Date(`${paidStr}T12:00:00+03:00`) : null;
  if (!paidAt) return fail("تحقق من الحقول", { paidAt: "أدخل تاريخ الدفع" });
  if (paidAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) return fail("تحقق من الحقول", { paidAt: "تاريخ الدفع لا يمكن أن يكون في المستقبل" });
  const paymentNote = optStr(form, "paymentNote");
  await db.teacherInvoice.update({ where: { id }, data: { status: "PAID", paidAt, paymentNote } });
  await audit(user, "invoice.paid", "TeacherInvoice", id, { paymentNote });
  const r = await syncTeacherStatus(inv.teacherId);
  refresh();
  return done(r.restored ? "سُجّل الدفع وأُعيد تفعيل حساب المعلم" : "تم تسجيل الدفع");
}

export async function cancelInvoice(id: string): Promise<ActionState> {
  const user = await requirePermission("bills.write");
  const inv = await db.teacherInvoice.findUnique({ where: { id } });
  if (!inv || inv.status === "PAID" || inv.status === "CANCELLED") return fail("لا يمكن إلغاء هذه الفاتورة");
  await db.teacherInvoice.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(user, "invoice.cancel", "TeacherInvoice", id);
  await syncTeacherStatus(inv.teacherId);
  refresh();
  return done("أُلغيت الفاتورة");
}

export async function deleteInvoice(id: string): Promise<ActionState> {
  const user = await requirePermission("bills.write");
  const inv = await db.teacherInvoice.findUnique({ where: { id } });
  if (!inv || inv.status !== "DRAFT") return fail("يمكن حذف المسودات فقط");
  await db.teacherInvoice.delete({ where: { id } });
  await audit(user, "invoice.delete", "TeacherInvoice", id, { number: inv.number });
  refresh();
  return done("حُذفت المسودة");
}
