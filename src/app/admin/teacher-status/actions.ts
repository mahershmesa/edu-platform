"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { syncTeacherStatus } from "@/server/teacher-status";

function refresh() {
  revalidatePath("/admin/teacher-status");
  revalidatePath("/admin/teachers");
}

export async function syncAllAction(): Promise<ActionState> {
  const user = await requirePermission("teacher_status.write");
  const r = await syncTeacherStatus();
  await audit(user, "teacher_status.sync", undefined, undefined, r);
  refresh();
  if (r.suspended === 0 && r.restored === 0) return done("تمت المزامنة، لا تغييرات");
  return done(`تمت المزامنة: إيقاف ${r.suspended}، إعادة تفعيل ${r.restored}`);
}

export async function setManualSuspension(teacherId: string, suspend: boolean): Promise<ActionState> {
  const user = await requirePermission("teacher_status.write");
  const t = await db.user.findFirst({ where: { id: teacherId, type: "TEACHER" } });
  if (!t) return fail("المعلم غير موجود");
  await db.user.update({ where: { id: teacherId }, data: { manualSuspended: suspend } });
  await audit(user, suspend ? "teacher.suspend" : "teacher.unsuspend", "User", teacherId, { name: t.name });
  refresh();
  return done(suspend ? `أُوقف ${t.name} يدوياً` : `أُعيد تفعيل ${t.name}`);
}
