"use server";

import { revalidatePath } from "next/cache";
import type { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { optStr } from "@/lib/utils";
import { isSafeUrl } from "@/lib/url";

export async function saveAppVersion(platform: Platform, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("app.write");
  const storeUrl = optStr(form, "storeUrl");
  const version = optStr(form, "version");
  const fieldErrors: Record<string, string> = {};
  if (storeUrl && (!isSafeUrl(storeUrl) || storeUrl.startsWith("/"))) fieldErrors.storeUrl = "رابط المتجر غير صالح";
  if (version && !/^\d+(\.\d+){0,3}$/.test(version)) fieldErrors.version = "رقم الإصدار مثل 1.0.2";
  if (Object.keys(fieldErrors).length) return fail("يرجى تصحيح الحقول المظللة", fieldErrors);
  const forceUpdate = form.get("updateType") === "force";
  await db.appVersion.upsert({
    where: { platform },
    create: { platform, storeUrl, version, forceUpdate },
    update: { storeUrl, version, forceUpdate },
  });
  await audit(user, "app.update", "AppVersion", platform, { storeUrl, version, forceUpdate });
  revalidatePath("/admin/app");
  return done("تم حفظ إعدادات التطبيق");
}
