"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { int, str } from "@/lib/utils";
import { normalizeIraqiPhone } from "@/lib/phone";
import { saveSettings } from "@/lib/settings";

const schema = z.object({
  platformName: z.string().trim().min(2, "اسم المنصة مطلوب").max(60),
  graceDays: z.number({ message: "أدخل رقماً" }).int().min(0, "لا يقل عن 0").max(90, "لا يزيد عن 90"),
  maxDevices: z.number({ message: "أدخل رقماً" }).int().min(1, "جهاز واحد على الأقل").max(10, "لا يزيد عن 10"),
  paymentInstructions: z.string().trim().max(1000),
});

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("settings.write");
  const parsed = schema.safeParse({
    platformName: str(form, "platformName"),
    graceDays: int(form, "graceDays") ?? undefined,
    maxDevices: int(form, "maxDevices") ?? undefined,
    paymentInstructions: str(form, "paymentInstructions"),
  });
  if (!parsed.success) return zodFail(parsed.error.issues);

  const fieldErrors: Record<string, string> = {};
  const normalize = (key: string) => {
    const raw = str(form, key);
    if (!raw) return "";
    const p = normalizeIraqiPhone(raw);
    if (!p) fieldErrors[key] = "أدخل رقماً عراقياً صحيحاً (07XXXXXXXXX)";
    return p ?? "";
  };
  const whatsapp = normalize("whatsapp");
  const supportPhone = normalize("supportPhone");
  if (Object.keys(fieldErrors).length) return fail("يرجى تصحيح الحقول المظللة", fieldErrors);

  await saveSettings({ ...parsed.data, whatsapp, supportPhone });
  await audit(user, "settings.update", "Setting", undefined, { ...parsed.data, whatsapp, supportPhone });
  revalidatePath("/", "layout");
  return done("تم حفظ الإعدادات");
}
