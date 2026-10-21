"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  DeviceLimitError,
  getCurrentUser,
  hashPassword,
  homeFor,
  stopImpersonation,
  verifyPassword,
} from "@/lib/auth";
import { fail, zodFail, type ActionState } from "@/lib/action";
import { normalizeIraqiPhone } from "@/lib/phone";
import { str } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

function safeNext(next: string): string | null {
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const identifier = str(form, "identifier");
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return fail("أدخل البريد أو رقم الهاتف وكلمة المرور");

  const phone = normalizeIraqiPhone(identifier);
  const user = phone
    ? await db.user.findUnique({ where: { phone } })
    : await db.user.findUnique({ where: { email: identifier.toLowerCase() } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("البيانات غير صحيحة، تأكد من البريد أو الهاتف وكلمة المرور");
  }
  if (user.status === "SUSPENDED" && user.type !== "TEACHER") {
    return fail("هذا الحساب موقوف. تواصل مع إدارة المنصة.");
  }
  try {
    await createSession(user);
  } catch (e) {
    if (e instanceof DeviceLimitError) {
      const s = await getSettings();
      return fail(
        `وصلت للحد الأقصى من الأجهزة (${s.maxDevices}). سجّل الخروج من جهاز قديم من صفحة حسابي، أو تواصل مع الدعم لإعادة التعيين.`,
      );
    }
    throw e;
  }
  redirect(safeNext(str(form, "next")) ?? homeFor(user.type));
}

const registerSchema = z
  .object({
    name: z.string().trim().min(3, "الاسم قصير جداً").max(80, "الاسم طويل جداً"),
    identifier: z.string().trim().min(1, "أدخل رقم الهاتف أو البريد"),
    password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(100),
    confirm: z.string(),
    governorate: z.string().trim().max(40).optional(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: str(form, "name"),
    identifier: str(form, "identifier"),
    password: String(form.get("password") ?? ""),
    confirm: String(form.get("confirm") ?? ""),
    governorate: str(form, "governorate") || undefined,
  });
  if (!parsed.success) return zodFail(parsed.error.issues);
  const { name, identifier, password, governorate } = parsed.data;

  const phone = normalizeIraqiPhone(identifier);
  let email: string | null = null;
  if (!phone) {
    const e = z.string().email().safeParse(identifier.toLowerCase());
    if (!e.success) return fail("تحقق من الحقول", { identifier: "أدخل رقم هاتف عراقي صحيح (07XXXXXXXXX) أو بريداً صحيحاً" });
    email = e.data;
  }
  const exists = await db.user.findFirst({ where: phone ? { phone } : { email } });
  if (exists) return fail("تحقق من الحقول", { identifier: phone ? "هذا الرقم مسجل مسبقاً" : "هذا البريد مسجل مسبقاً" });

  const user = await db.user.create({
    data: { name, phone, email, governorate, type: "STUDENT", passwordHash: await hashPassword(password) },
  });
  await createSession(user);
  redirect(safeNext(str(form, "next")) ?? "/my-courses");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function stopImpersonationAction() {
  const user = await getCurrentUser();
  await stopImpersonation();
  redirect(user?.impersonator ? `/admin/teachers/${user.id}` : "/login");
}
