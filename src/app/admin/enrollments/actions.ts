"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";

export async function setEnrollmentStatus(id: string, revoke: boolean): Promise<ActionState> {
  const user = await requirePermission("enrollments.write");
  const e = await db.enrollment.findUnique({ where: { id } });
  if (!e) return fail("الاشتراك غير موجود");
  await db.enrollment.update({ where: { id }, data: { status: revoke ? "REVOKED" : "ACTIVE" } });
  await audit(user, revoke ? "enrollment.revoke" : "enrollment.restore", "Enrollment", id);
  revalidatePath("/admin/enrollments");
  return done(revoke ? "تم إلغاء الاشتراك" : "تمت استعادة الاشتراك");
}
