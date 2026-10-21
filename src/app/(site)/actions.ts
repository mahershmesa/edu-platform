"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, requireStudent, requireUser, verifyPassword } from "@/lib/auth";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { str } from "@/lib/utils";
import { canWatchLesson } from "@/server/access";
import { redeemCode } from "@/server/redeem";
import { GOVERNORATES } from "@/lib/governorates";
import { DEVICE_REMOVAL_HOURS } from "@/components/site/constants";

export async function redeemAction(targetCourseId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("سجّل الدخول أولاً لتفعيل الكود");
  if (user.type !== "STUDENT") return fail("تفعيل الأكواد متاح لحسابات الطلاب فقط");
  const code = str(form, "code");
  if (!code) return fail("أدخل الكود", { code: "الكود مطلوب" });
  const res = await redeemCode(user.id, code, targetCourseId ?? undefined);
  if (!res.ok) return fail(res.error, { code: res.error });
  revalidatePath("/my-courses");
  for (const c of res.courses) revalidatePath(`/courses/${c.id}`);
  const titles = res.courses.map((c) => c.title).join("، ");
  return done(`تم تفعيل الكود! فُتحت: ${titles}`, { courses: res.courses });
}

/** Mark a lesson finished / unfinished for the current student. */
export async function setLessonCompleted(lessonId: string, completed: boolean): Promise<ActionState> {
  const user = await requireStudent();
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { teacherId: true, status: true } } },
  });
  if (!lesson || !(await canWatchLesson(user, lesson))) return fail("لا يمكنك الوصول لهذا الدرس");
  await db.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: user.id, lessonId } },
    create: { studentId: user.id, lessonId, completedAt: completed ? new Date() : null },
    update: { completedAt: completed ? new Date() : null },
  });
  revalidatePath(`/learn/${lesson.courseId}`, "layout");
  revalidatePath("/my-courses");
  return done(completed ? "أحسنت! تم تسجيل إنهاء الدرس" : "أُلغي تسجيل الإنهاء");
}

const profileSchema = z.object({
  name: z.string().trim().min(3, "الاسم قصير جداً").max(80, "الاسم طويل جداً"),
  governorate: z
    .string()
    .nullable()
    .refine((v) => v === null || (GOVERNORATES as readonly string[]).includes(v), "محافظة غير صالحة"),
});

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.impersonator) return fail("لا يمكن تعديل الحساب أثناء وضع المعاينة");
  const parsed = profileSchema.safeParse({ name: str(form, "name"), governorate: str(form, "governorate") || null });
  if (!parsed.success) return zodFail(parsed.error.issues);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/account");
  return done("تم حفظ بياناتك");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "أدخل كلمة المرور الحالية"),
    password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(100),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.impersonator) return fail("لا يمكن تغيير كلمة المرور أثناء وضع المعاينة");
  const parsed = passwordSchema.safeParse({
    current: String(form.get("current") ?? ""),
    password: String(form.get("password") ?? ""),
    confirm: String(form.get("confirm") ?? ""),
  });
  if (!parsed.success) return zodFail(parsed.error.issues);
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return fail("تحقق من الحقول", { current: "كلمة المرور الحالية غير صحيحة" });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  // Sign out every other session for safety.
  await db.session.deleteMany({ where: { userId: user.id, id: { not: user.sessionId } } });
  return done("تم تغيير كلمة المرور، وسُجّل الخروج من بقية الأجهزة");
}

/** Students may sign a different device out once every 24 hours. */
export async function removeDeviceAction(deviceId: string): Promise<ActionState> {
  const user = await requireUser();
  if (user.impersonator) return fail("غير متاح أثناء وضع المعاينة");
  const device = await db.device.findFirst({ where: { id: deviceId, userId: user.id } });
  if (!device) return fail("الجهاز غير موجود");
  const fp = (await cookies()).get("asaas_device")?.value;
  if (fp && device.fingerprint === fp) return fail("لا يمكنك إزالة الجهاز الذي تستخدمه الآن، استخدم تسجيل الخروج");

  const key = `deviceRemoval:${user.id}`;
  if (user.type === "STUDENT") {
    const last = await db.setting.findUnique({ where: { key } });
    const lastAt = last ? Number(last.value) : 0;
    const waitMs = lastAt + DEVICE_REMOVAL_HOURS * 3600 * 1000 - Date.now();
    if (waitMs > 0) {
      const hours = Math.ceil(waitMs / 3600 / 1000);
      return fail(`يمكنك إزالة جهاز مرة واحدة كل ${DEVICE_REMOVAL_HOURS} ساعة. حاول بعد ${hours} ساعة أو تواصل مع الدعم.`);
    }
  }
  await db.$transaction([
    db.device.delete({ where: { id: device.id } }),
    db.setting.upsert({ where: { key }, create: { key, value: String(Date.now()) }, update: { value: String(Date.now()) } }),
  ]);
  revalidatePath("/account");
  return done("تم تسجيل الخروج من الجهاز");
}
