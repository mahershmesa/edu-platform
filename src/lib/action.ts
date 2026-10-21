// نتيجة موحّدة لكل server actions تُعرض في النماذج.
export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  /** Arbitrary payload (e.g. generated codes). */
  data?: unknown;
};

export const initialState: ActionState = {};

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function done(message?: string, data?: unknown): ActionState {
  return { ok: true, message, data };
}

/** Turn a zod error into field errors (first message per field). */
export function zodFail(issues: { path: PropertyKey[]; message: string }[]): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    if (!fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return fail("يرجى تصحيح الحقول المظللة", fieldErrors);
}
