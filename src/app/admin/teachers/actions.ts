"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, requirePermission, startImpersonation } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { optStr } from "@/lib/utils";
import { parseUserIdentity, passwordSchema, resolveAvatar } from "@/server/admin-users";

function revalidate(id?: string) {
  revalidatePath("/admin/teachers");
  if (id) revalidatePath(`/admin/teachers/${id}`);
}

export async function createTeacher(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("teachers.write");
  const identity = await parseUserIdentity(form);
  const pw = passwordSchema.safeParse(String(form.get("password") ?? ""));
  const fieldErrors = identity.ok ? {} : { ...identity.fieldErrors };
  if (!pw.success) fieldErrors.password = pw.error.issues[0].message;
  if (!identity.ok || !pw.success) return fail("يرجى تصحيح الحقول المظللة", fieldErrors);

  const avatar = await resolveAvatar(form, user.id, null);
  if (!avatar.ok) return fail(avatar.error, { avatarFile: avatar.error });

  const t = await db.user.create({
    data: {
      ...identity.data,
      bio: optStr(form, "bio"),
      avatarUrl: avatar.url,
      type: "TEACHER",
      passwordHash: await hashPassword(pw.data),
    },
  });
  await audit(user, "teacher.create", "User", t.id, { name: t.name });
  revalidate();
  return done("تمت إضافة المعلم");
}

export async function updateTeacher(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("teachers.write");
  const teacher = await db.user.findFirst({ where: { id, type: "TEACHER" } });
  if (!teacher) return fail("المعلم غير موجود");
  const identity = await parseUserIdentity(form, { excludeId: id });
  if (!identity.ok) return fail("يرجى تصحيح الحقول المظللة", identity.fieldErrors);
  const avatar = await resolveAvatar(form, user.id, teacher.avatarUrl);
  if (!avatar.ok) return fail(avatar.error, { avatarFile: avatar.error });

  await db.user.update({
    where: { id },
    data: { ...identity.data, bio: optStr(form, "bio"), avatarUrl: avatar.url },
  });
  await audit(user, "teacher.update", "User", id);
  revalidate(id);
  return done("تم حفظ التعديلات");
}

export async function setTeacherSuspended(id: string, suspended: boolean): Promise<ActionState> {
  const user = await requirePermission("teachers.write");
  const teacher = await db.user.findFirst({ where: { id, type: "TEACHER" } });
  if (!teacher) return fail("المعلم غير موجود");
  await db.user.update({
    where: { id },
    data: { manualSuspended: suspended, status: suspended ? "SUSPENDED" : "ACTIVE" },
  });
  await audit(user, suspended ? "teacher.suspend" : "teacher.activate", "User", id);
  revalidate(id);
  return done(suspended ? "تم إيقاف المعلم" : "تم تفعيل المعلم");
}

export async function changeTeacherPassword(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("teachers.write");
  const pw = passwordSchema.safeParse(String(form.get("password") ?? ""));
  if (!pw.success) return fail("يرجى تصحيح الحقول المظللة", { password: pw.error.issues[0].message });
  if (pw.data !== String(form.get("confirm") ?? "")) return fail("يرجى تصحيح الحقول المظللة", { confirm: "كلمتا المرور غير متطابقتين" });
  const teacher = await db.user.findFirst({ where: { id, type: "TEACHER" } });
  if (!teacher) return fail("المعلم غير موجود");
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(pw.data) } });
  // Log out existing sessions so the new password takes effect everywhere.
  await db.session.deleteMany({ where: { userId: id } });
  await audit(user, "teacher.change_password", "User", id);
  return done("تم تغيير كلمة المرور");
}

export async function deleteTeacher(id: string): Promise<ActionState> {
  const user = await requirePermission("teachers.delete");
  const teacher = await db.user.findFirst({ where: { id, type: "TEACHER" }, include: { _count: { select: { courses: true } } } });
  if (!teacher) return fail("المعلم غير موجود");
  if (teacher._count.courses > 0) return fail(`لا يمكن الحذف: لدى المعلم ${teacher._count.courses} دورة. احذفها أو انقلها أولاً.`);
  await db.user.delete({ where: { id } });
  await audit(user, "teacher.delete", "User", id, { name: teacher.name });
  revalidate();
  return done("تم حذف المعلم");
}

export async function impersonateTeacher(id: string): Promise<ActionState> {
  const user = await requirePermission("teachers.impersonate");
  try {
    await startImpersonation(user, id);
  } catch {
    return fail("المعلم غير موجود");
  }
  await audit(user, "teacher.impersonate", "User", id);
  redirect("/teacher");
}
