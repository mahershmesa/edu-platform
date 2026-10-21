import { randomInt } from "node:crypto";

// أحرف سهلة القراءة: بدون 0/O و1/I/L
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 7;

export function generateCode(length = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** Generate `count` distinct codes not present in `taken`. */
export function generateUniqueCodes(count: number, taken: Set<string>, length = CODE_LENGTH): string[] {
  const out = new Set<string>();
  let guard = 0;
  while (out.size < count) {
    const c = generateCode(length);
    if (!taken.has(c)) out.add(c);
    if (++guard > count * 50) throw new Error("تعذر توليد أكواد فريدة");
  }
  return [...out];
}

export function normalizeCodeInput(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export type CodeState = "ACTIVE" | "DISABLED" | "EXHAUSTED" | "EXPIRED";

export function codeState(
  code: { isActive: boolean; usageLimit: number | null; usedCount: number; expiresAt: Date | null },
  now = new Date(),
): CodeState {
  if (!code.isActive) return "DISABLED";
  if (code.expiresAt && code.expiresAt < now) return "EXPIRED";
  if (code.usageLimit !== null && code.usedCount >= code.usageLimit) return "EXHAUSTED";
  return "ACTIVE";
}

export const CODE_STATE_LABELS: Record<CodeState, string> = {
  ACTIVE: "نشط",
  DISABLED: "معطّل",
  EXHAUSTED: "مستنفد",
  EXPIRED: "منتهٍ",
};

export type RedeemCheck =
  | { ok: true; courseIds: string[] }
  | { ok: false; reason: "NOT_FOUND" | "DISABLED" | "EXHAUSTED" | "EXPIRED" | "ALREADY_USED" | "NOT_FOR_COURSE" | "ALREADY_ENROLLED" };

/**
 * Decide which courses a student may unlock with a code.
 * - A code works once per student per course.
 * - `targetCourseId` limits redemption to one course (from the course page).
 * - Courses the student is already enrolled in are skipped.
 */
export function checkRedeem(input: {
  code: { isActive: boolean; usageLimit: number | null; usedCount: number; expiresAt: Date | null; courseIds: string[] } | null;
  usedCourseIdsByStudent: string[];
  enrolledCourseIds: string[];
  targetCourseId?: string;
  now?: Date;
}): RedeemCheck {
  const { code } = input;
  if (!code) return { ok: false, reason: "NOT_FOUND" };
  const state = codeState(code, input.now);
  if (state !== "ACTIVE") return { ok: false, reason: state };

  let candidates = code.courseIds;
  if (input.targetCourseId) {
    if (!candidates.includes(input.targetCourseId)) return { ok: false, reason: "NOT_FOR_COURSE" };
    candidates = [input.targetCourseId];
  }
  const notUsed = candidates.filter((id) => !input.usedCourseIdsByStudent.includes(id));
  if (notUsed.length === 0) return { ok: false, reason: "ALREADY_USED" };
  const fresh = notUsed.filter((id) => !input.enrolledCourseIds.includes(id));
  if (fresh.length === 0) return { ok: false, reason: "ALREADY_ENROLLED" };
  return { ok: true, courseIds: fresh };
}

export const REDEEM_ERRORS: Record<Exclude<RedeemCheck, { ok: true }>["reason"], string> = {
  NOT_FOUND: "الكود غير صحيح، تأكد من كتابته كما هو.",
  DISABLED: "هذا الكود معطّل، تواصل مع المعلم.",
  EXHAUSTED: "هذا الكود استُخدم بالكامل ولم يعد صالحاً.",
  EXPIRED: "انتهت صلاحية هذا الكود.",
  ALREADY_USED: "استخدمت هذا الكود سابقاً لهذه الدورة.",
  NOT_FOR_COURSE: "هذا الكود لا يخص هذه الدورة.",
  ALREADY_ENROLLED: "أنت مشترك مسبقاً في الدورات التي يفتحها هذا الكود.",
};

/** Brute-force guard: max wrong attempts within the window. */
export const REDEEM_MAX_FAILS = 5;
export const REDEEM_WINDOW_MIN = 15;
