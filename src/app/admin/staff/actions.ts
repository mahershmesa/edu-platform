"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { optStr } from "@/lib/utils";
import { parseUserIdentity, passwordSchema } from "@/server/admin-users";

async function validRole(roleId: string | null): Promise<boolean> {
  if (!roleId) return false;
  return (await db.role.count({ where: { id: roleId } })) > 0;
}

export async function createStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("staff.write");
  const identity = await parseUserIdentity(form);
  const pw = passwordSchema.safeParse(String(form.get("password") ?? ""));
  const roleId = optStr(form, "roleId");
  const fieldErrors = identity.ok ? {} : { ...identity.fieldErrors };
  if (!pw.success) fieldErrors.password = pw.error.issues[0].message;
  if (!(await validRole(roleId))) fieldErrors.roleId = "اختر الدور";
  if (!identity.ok || !pw.success || fieldErrors.roleId) return fail("يرجى تصحيح الحقول المظللة", fieldErrors);
  // Only the system admin may grant a role that includes role management.
  if (user.type !== "ADMIN" && (await grantsRoleManagement(roleId!))) return fail("لا يمكنك إسناد دور يتضمن إدارة الأدوار");

  const s = await db.user.create({
    data: { ...identity.data, roleId, type: "STAFF", passwordHash: await hashPassword(pw.data) },
  });
  await audit(user, "staff.create", "User", s.id, { name: s.name });
  revalidatePath("/admin/staff");
  return done("تمت إضافة الموظف");
}

export async function updateStaff(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("staff.write");
  const staff = await db.user.findFirst({ where: { id, type: "STAFF" } });
  if (!staff) return fail("الموظف غير موجود");
  const identity = await parseUserIdentity(form, { excludeId: id });
  const roleId = optStr(form, "roleId");
  const fieldErrors = identity.ok ? {} : { ...identity.fieldErrors };
  if (!(await validRole(roleId))) fieldErrors.roleId = "اختر الدور";
  if (!identity.ok || fieldErrors.roleId) return fail("يرجى تصحيح الحقول المظللة", fieldErrors);
  if (user.type !== "ADMIN" && (await grantsRoleManagement(roleId!))) return fail("لا يمكنك إسناد دور يتضمن إدارة الأدوار");
  if (id === user.id && roleId !== staff.roleId) return fail("لا يمكنك تغيير دورك بنفسك");

  await db.user.update({ where: { id }, data: { ...identity.data, roleId } });
  await audit(user, "staff.update", "User", id);
  revalidatePath("/admin/staff");
  return done("تم حفظ التعديلات");
}

export async function setStaffStatus(id: string, suspend: boolean): Promise<ActionState> {
  const user = await requirePermission("staff.write");
  if (id === user.id) return fail("لا يمكنك إيقاف حسابك");
  const staff = await db.user.findFirst({ where: { id, type: "STAFF" } });
  if (!staff) return fail("الموظف غير موجود");
  await db.user.update({ where: { id }, data: { status: suspend ? "SUSPENDED" : "ACTIVE" } });
  if (suspend) await db.session.deleteMany({ where: { userId: id } });
  await audit(user, suspend ? "staff.suspend" : "staff.activate", "User", id);
  revalidatePath("/admin/staff");
  return done(suspend ? "تم إيقاف الموظف" : "تم تفعيل الموظف");
}

export async function changeStaffPassword(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("staff.write");
  const pw = passwordSchema.safeParse(String(form.get("password") ?? ""));
  if (!pw.success) return fail("يرجى تصحيح الحقول المظللة", { password: pw.error.issues[0].message });
  if (pw.data !== String(form.get("confirm") ?? "")) return fail("يرجى تصحيح الحقول المظللة", { confirm: "كلمتا المرور غير متطابقتين" });
  const staff = await db.user.findFirst({ where: { id, type: "STAFF" } });
  if (!staff) return fail("الموظف غير موجود");
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(pw.data) } });
  await db.session.deleteMany({ where: { userId: id, ...(id === user.id && { id: { not: user.sessionId } }) } });
  await audit(user, "staff.change_password", "User", id);
  return done("تم تغيير كلمة المرور");
}

async function grantsRoleManagement(roleId: string): Promise<boolean> {
  return (await db.rolePermission.count({ where: { roleId, permission: { startsWith: "roles." } } })) > 0;
}
