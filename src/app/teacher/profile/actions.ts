"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireTeacher, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { normalizeIraqiPhone } from "@/lib/phone";
import { optStr, str } from "@/lib/utils";
import { deleteUpload, hasFile, saveUpload, UploadError } from "@/server/uploads";

function refresh() {
  revalidatePath("/teacher", "layout");
}

const profileSchema = z.object({
  name: z.string().trim().min(3, "الاسم قصير جداً").max(80, "الاسم طويل جداً"),
  bio: z.string().trim().max(1000, "النبذة طويلة جداً").nullable(),
});

export async function updateProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  const parsed = profileSchema.safeParse({ name: str(form, "name"), bio: optStr(form, "bio") });
  if (!parsed.success) return zodFail(parsed.error.issues);
  const phoneRaw = optStr(form, "phone");
  let phone: string | null = null;
  if (phoneRaw) {
    phone = normalizeIraqiPhone(phoneRaw);
    if (!phone) return fail("تحقق من الحقول", { phone: "رقم هاتف عراقي غير صالح (07XXXXXXXXX)" });
    const taken = await db.user.findFirst({ where: { phone, id: { not: user.id } } });
    if (taken) return fail("تحقق من الحقول", { phone: "هذا الرقم مستخدم بحساب آخر" });
  }
  if (!phone && !user.email) return fail("تحقق من الحقول", { phone: "رقم الهاتف مطلوب لأن الحساب بلا بريد" });
  await db.user.update({ where: { id: user.id }, data: { ...parsed.data, phone } });
  await audit(user, "profile.update", "User", user.id);
  refresh();
  return done("تم حفظ الملف الشخصي");
}

export async function uploadAvatar(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  const file = form.get("avatar");
  if (!hasFile(file)) return fail("اختر صورة أولاً");
  try {
    const { url } = await saveUpload(file, { ownerId: user.id, groupName: "avatars", isPublic: true });
    const old = user.avatarUrl;
    await db.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
    if (old?.startsWith("/files/")) await deleteUpload(old.slice("/files/".length));
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    throw e;
  }
  await audit(user, "profile.avatar", "User", user.id);
  refresh();
  return done("تم تحديث الصورة");
}

export async function removeAvatar(): Promise<ActionState> {
  const user = await requireTeacher();
  const old = user.avatarUrl;
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  if (old?.startsWith("/files/")) await deleteUpload(old.slice("/files/".length));
  refresh();
  return done("أُزيلت الصورة");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "أدخل كلمة المرور الحالية"),
    password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(100),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTeacher();
  const parsed = passwordSchema.safeParse({
    current: String(form.get("current") ?? ""),
    password: String(form.get("password") ?? ""),
    confirm: String(form.get("confirm") ?? ""),
  });
  if (!parsed.success) return zodFail(parsed.error.issues);
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) return fail("تحقق من الحقول", { current: "كلمة المرور الحالية غير صحيحة" });
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  // Log out other sessions of this teacher (keep the current one).
  await db.session.deleteMany({ where: { userId: user.id, id: { not: user.sessionId }, impersonatorId: null } });
  await audit(user, "profile.password", "User", user.id);
  return done("تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى");
}
