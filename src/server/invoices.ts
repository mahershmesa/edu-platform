import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { invoiceNumber } from "@/lib/domain/invoices";

/** Create an invoice with the next yearly number, retrying on a number collision. */
export async function createInvoiceWithNumber(data: Omit<Prisma.TeacherInvoiceUncheckedCreateInput, "number">) {
  const now = new Date();
  const prefix = `INV-${now.getFullYear()}-`;
  let seq = (await db.teacherInvoice.count({ where: { number: { startsWith: prefix } } })) + 1;
  for (let attempt = 0; attempt < 8; attempt++, seq++) {
    try {
      return await db.teacherInvoice.create({ data: { ...data, number: invoiceNumber(seq, now) } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("تعذر توليد رقم فاتورة");
}

/** Prisma filter for the computed status views (OVERDUE = DUE past due date). */
export function invoiceViewWhere(view: string, now = new Date()): Prisma.TeacherInvoiceWhereInput {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  switch (view) {
    case "OVERDUE":
      return { status: "DUE", dueDate: { lt: today } };
    case "DUE":
      return { status: "DUE", dueDate: { gte: today } };
    case "DRAFT":
    case "PAID":
    case "CANCELLED":
      return { status: view };
    default:
      return {};
  }
}
