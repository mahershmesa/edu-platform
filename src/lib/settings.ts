import "server-only";
import { cache } from "react";
import { db } from "./db";

export type AppSettings = {
  platformName: string;
  graceDays: number;
  maxDevices: number;
  whatsapp: string;
  supportPhone: string;
  paymentInstructions: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  platformName: "أساس أكاديمي",
  graceDays: 7,
  maxDevices: 2,
  whatsapp: "",
  supportPhone: "",
  paymentInstructions: "يتم دفع الاشتراك نقداً أو بالتحويل، تواصل مع إدارة المنصة لتأكيد الدفع.",
};

export const getSettings = cache(async (): Promise<AppSettings> => {
  const rows = await db.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    platformName: map.platformName || DEFAULT_SETTINGS.platformName,
    graceDays: toInt(map.graceDays, DEFAULT_SETTINGS.graceDays),
    maxDevices: toInt(map.maxDevices, DEFAULT_SETTINGS.maxDevices),
    whatsapp: map.whatsapp ?? DEFAULT_SETTINGS.whatsapp,
    supportPhone: map.supportPhone ?? DEFAULT_SETTINGS.supportPhone,
    paymentInstructions: map.paymentInstructions || DEFAULT_SETTINGS.paymentInstructions,
  };
});

function toInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function saveSettings(values: Partial<Record<keyof AppSettings, string | number>>) {
  await db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } }),
    ),
  );
}
