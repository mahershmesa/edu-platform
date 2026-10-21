import { toLatinDigits } from "./utils";

/**
 * Normalize an Iraqi mobile number to +9647XXXXXXXXX.
 * Accepts 07XXXXXXXXX, 7XXXXXXXXX, 9647XXXXXXXXX, +9647XXXXXXXXX, 009647XXXXXXXXX.
 * Returns null when the input is not a valid Iraqi mobile number.
 */
export function normalizeIraqiPhone(input: string): string | null {
  let s = toLatinDigits(input).replace(/[\s\-()]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("964")) s = s.slice(3);
  if (s.startsWith("0")) s = s.slice(1);
  if (!/^7\d{9}$/.test(s)) return null;
  return `+964${s}`;
}

/** Display form: 07XX XXX XXXX */
export function displayPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const m = phone.match(/^\+964(7\d{2})(\d{3})(\d{4})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone;
}
