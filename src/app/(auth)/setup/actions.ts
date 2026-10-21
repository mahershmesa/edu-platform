"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, zodFail, type ActionState } from "@/lib/action";
import { str } from "@/lib/utils";
import { ensureSystemData, hasAdmin } from "@/server/bootstrap";

const schema = z
  .object({
    name: z.string().trim().min(3, "الاسم قصير جداً"),
    email: z.string().trim().toLowerCase().email("بريد غير صالح"),
    password: z.string().min(10, "كلمة المرور 10 أحرف على الأقل"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });

export async function setupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (await hasAdmin()) return fail("تم إعداد المنصة مسبقاً");
  const parsed = schema.safeParse({
    name: str(form, "name"),
    email: str(form, "email"),
    password: String(form.get("password") ?? ""),
    confirm: String(form.get("confirm") ?? ""),
  });
  if (!parsed.success) return zodFail(parsed.error.issues);
  await ensureSystemData();
  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, type: "ADMIN", passwordHash: await hashPassword(parsed.data.password) },
  });
  await createSession(user);
  redirect("/admin");
}
