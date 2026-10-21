"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { optStr } from "@/lib/utils";
import { GOVERNORATES } from "@/lib/governorates";
import { parseUserIdentity, passwordSchema } from "@/server/admin-users";

function governorate(form: FormData): string | null {
  const g = optStr(form, "governorate");
  return g && (GOVERNORATES as readonly string[]).includes(g) ? g : null;
}

export async function createStudent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("students.write");
  const identity = await parseUserIdentity(form);
  const pw = passwordSchema.safeParse(String(form.get("password") ?? ""));
  const fieldErrors = identity.ok ? {} : { ...identity.fieldErrors };
  if (!pw.success) fieldErrors.password = pw.error.issues[0].message;
  if (!identity.ok || !pw.success) return fail("يرجى تصحيح الحقول المظللة", fieldErrors);
  const s = await db.user.create({
    data: { ...identity.data, governorate: governorate(form), type: "STUDENT", passwordHash: await hashPassword(pw.data) },
  });
  await audit(user, "student.create", "User", s.id, { name: s.name });
  revalidatePath("/admin/students");
  return done("تمت إضافة الطالب");
}

export async function updateStudent(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("students.write");
  const student = await db.user.findFirst({ where: { id, type: "STUDENT" } });
  if (!student) return fail("الطالب غير موجود");
  const identity = await parseUserIdentity(form, { excludeId: id });
  if (!identity.ok) return fail("يرجى تصحيح الحقول المظللة", identity.fieldErrors);
  await db.user.update({ where: { id }, data: { ...identity.data, governorate: governorate(form) } });
  await audit(user, "student.update", "User", id);
  revalidatePath("/admin/students");
  return done("تم حفظ التعديلات");
}

export async function setStudentStatus(id: string, suspend: boolean): Promise<ActionState> {
  const user = await requirePermission("students.write");
  const student = await db.user.findFirst({ where: { id, type: "STUDENT" } });
  if (!student) return fail("الطالب غير موجود");
  await db.user.update({ where: { id }, data: { status: suspend ? "SUSPENDED" : "ACTIVE" } });
  if (suspend) await db.session.deleteMany({ where: { userId: id } });
  await audit(user, suspend ? "student.suspend" : "student.activate", "User", id);
  revalidatePath("/admin/students");
  return done(suspend ? "تم إيقاف الطالب" : "تم تفعيل الطالب");
}

export async function changeStudentPassword(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("students.change_password");
  const pw = passwordSchema.safeParse(String(form.get("password") ?? ""));
  if (!pw.success) return fail("يرجى تصحيح الحقول المظللة", { password: pw.error.issues[0].message });
  if (pw.data !== String(form.get("confirm") ?? "")) return fail("يرجى تصحيح الحقول المظللة", { confirm: "كلمتا المرور غير متطابقتين" });
  const student = await db.user.findFirst({ where: { id, type: "STUDENT" } });
  if (!student) return fail("الطالب غير موجود");
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(pw.data) } });
  await db.session.deleteMany({ where: { userId: id } });
  await audit(user, "student.change_password", "User", id);
  return done("تم تغيير كلمة المرور");
}

/** Remove one device (or all when deviceId is null). Sessions on those devices are deleted by cascade. */
export async function resetStudentDevices(id: string, deviceId: string | null): Promise<ActionState> {
  const user = await requirePermission("students.reset_devices");
  const student = await db.user.findFirst({ where: { id, type: "STUDENT" } });
  if (!student) return fail("الطالب غير موجود");
  const { count } = await db.device.deleteMany({ where: { userId: id, ...(deviceId && { id: deviceId }) } });
  await audit(user, "student.reset_devices", "User", id, { removed: count });
  revalidatePath("/admin/students");
  return done(deviceId ? "تم حذف الجهاز" : "تمت إعادة تعيين كل الأجهزة");
}
