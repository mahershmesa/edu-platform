// تنسيق موحّد للأرقام والتواريخ في كل الموقع: أرقام لاتينية وأسماء أشهر عربية.
const LOCALE = "ar-IQ-u-nu-latn";

const numberFmt = new Intl.NumberFormat(LOCALE);
const dateFmt = new Intl.DateTimeFormat(LOCALE, { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Baghdad" });
const shortDateFmt = new Intl.DateTimeFormat(LOCALE, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Baghdad" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Baghdad",
});

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

export function formatIQD(amount: number): string {
  if (amount === 0) return "مجاني";
  return `${numberFmt.format(amount)} د.ع`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}

export function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return shortDateFmt.format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateTimeFmt.format(new Date(d));
}

/** yyyy-mm-dd for <input type="date"> */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function formatDuration(min: number | null | undefined): string {
  if (!min) return "مدة غير محددة";
  if (min < 60) return `${min} دقيقة`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ساعة و${m} دقيقة` : `${h} ساعة`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "؟";
}
