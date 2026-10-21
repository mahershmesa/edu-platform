"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { optStr, str } from "@/lib/utils";
import { deleteUpload } from "@/server/uploads";

const SUSPENDED = "حسابك موقوف حالياً، لا يمكنك تعديل الملفات.";

async function own(id: string) {
  const user = await requireTeacher();
  const file = await db.mediaFile.findFirst({ where: { id, ownerId: user.id } });
  return { user, file };
}

export async function updateMedia(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, file } = await own(id);
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  if (!file) return fail("الملف غير موجود");
  const originalName = str(form, "originalName").slice(0, 200);
  if (!originalName) return fail("تحقق من الحقول", { originalName: "اسم الملف مطلوب" });
  const groupName = optStr(form, "groupName")?.slice(0, 60) ?? null;
  await db.mediaFile.update({ where: { id }, data: { originalName, groupName } });
  revalidatePath("/teacher/media");
  return done("تم حفظ التعديلات");
}

export async function toggleMediaPublic(id: string): Promise<ActionState> {
  const { user, file } = await own(id);
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  if (!file) return fail("الملف غير موجود");
  await db.mediaFile.update({ where: { id }, data: { isPublic: !file.isPublic } });
  revalidatePath("/teacher/media");
  return done(file.isPublic ? "أصبح الملف خاصاً" : "أصبح الملف عاماً");
}

export async function deleteMedia(id: string): Promise<ActionState> {
  const { user, file } = await own(id);
  if (!teacherCanEdit(user)) return fail(SUSPENDED);
  if (!file) return fail("الملف غير موجود");
  const used = await db.lesson.count({ where: { attachmentId: id } });
  if (used > 0) return fail(`الملف مرفق بـ ${used} درس. أزل المرفق من الدروس أولاً.`);
  await deleteUpload(file.storedName);
  await audit(user, "media.delete", "MediaFile", id, { name: file.originalName });
  revalidatePath("/teacher/media");
  return done("تم حذف الملف");
}
