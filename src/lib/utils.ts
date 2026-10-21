import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Read a string from FormData ("" when missing). */
export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function int(form: FormData, key: string): number | null {
  const v = str(form, key).replace(/[,\s]/g, "");
  if (v === "") return null;
  const n = Number(toLatinDigits(v));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Convert Arabic-Indic / Persian digits to Latin digits. */
export function toLatinDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export const PAGE_SIZE = 20;

export function pageFrom(searchParams: Record<string, string | string[] | undefined>): number {
  const p = Number(searchParams.page ?? 1);
  return Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;
}

export function sp(searchParams: Record<string, string | string[] | undefined>, key: string): string {
  const v = searchParams[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}
