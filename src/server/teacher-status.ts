import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { shouldBillingSuspend } from "@/lib/domain/invoices";

/**
 * Apply the billing rule: a teacher with a DUE invoice more than `graceDays` past its due date
 * is billing-suspended; paying (or cancelling) lifts it. Manual suspension is untouched.
 * Returns how many teachers changed state.
 */
export async function syncTeacherStatus(teacherId?: string): Promise<{ suspended: number; restored: number }> {
  const { graceDays } = await getSettings();
  const teachers = await db.user.findMany({
    where: { type: "TEACHER", ...(teacherId && { id: teacherId }) },
    select: {
      id: true,
      billingSuspended: true,
      invoices: { where: { status: "DUE" }, select: { status: true, dueDate: true, amount: true } },
    },
  });
  let suspended = 0;
  let restored = 0;
  const now = new Date();
  for (const t of teachers) {
    const block = shouldBillingSuspend(t.invoices, graceDays, now);
    if (block !== t.billingSuspended) {
      await db.user.update({ where: { id: t.id }, data: { billingSuspended: block } });
      if (block) suspended++;
      else restored++;
    }
  }
  return { suspended, restored };
}
