import { describe, expect, it } from "vitest";
import {
  checkRedeem,
  CODE_ALPHABET,
  CODE_LENGTH,
  codeState,
  generateCode,
  generateUniqueCodes,
  normalizeCodeInput,
  REDEEM_ERRORS,
} from "@/lib/domain/codes";

const base = { isActive: true, usageLimit: null as number | null, usedCount: 0, expiresAt: null as Date | null };

describe("code generation", () => {
  it("uses only the readable alphabet and the default length", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toHaveLength(CODE_LENGTH);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
    }
  });

  it("never contains ambiguous characters", () => {
    for (const ch of ["0", "O", "1", "I", "L"]) expect(CODE_ALPHABET).not.toContain(ch);
  });

  it("respects a custom length", () => {
    expect(generateCode(10)).toHaveLength(10);
  });

  it("generates distinct codes that avoid taken ones", () => {
    const taken = new Set(generateUniqueCodes(50, new Set()));
    const fresh = generateUniqueCodes(500, taken);
    expect(new Set(fresh).size).toBe(500);
    for (const c of fresh) expect(taken.has(c)).toBe(false);
  });

  it("throws when uniqueness is impossible", () => {
    const all = new Set<string>();
    for (const a of CODE_ALPHABET) all.add(a);
    expect(() => generateUniqueCodes(1, all, 1)).toThrow();
  });

  it("normalizes user input", () => {
    expect(normalizeCodeInput(" ab3-k7 q ")).toBe("AB3K7Q");
  });
});

describe("codeState", () => {
  const now = new Date("2026-05-01T12:00:00Z");
  it("is ACTIVE by default", () => expect(codeState(base, now)).toBe("ACTIVE"));
  it("DISABLED wins over everything", () =>
    expect(codeState({ ...base, isActive: false, usageLimit: 1, usedCount: 1, expiresAt: new Date("2020-01-01") }, now)).toBe("DISABLED"));
  it("EXPIRED when past expiry", () => expect(codeState({ ...base, expiresAt: new Date("2026-04-30T00:00:00Z") }, now)).toBe("EXPIRED"));
  it("still ACTIVE before expiry", () => expect(codeState({ ...base, expiresAt: new Date("2026-05-02T00:00:00Z") }, now)).toBe("ACTIVE"));
  it("EXHAUSTED at the usage limit", () => expect(codeState({ ...base, usageLimit: 3, usedCount: 3 }, now)).toBe("EXHAUSTED"));
  it("ACTIVE below the limit", () => expect(codeState({ ...base, usageLimit: 3, usedCount: 2 }, now)).toBe("ACTIVE"));
  it("unlimited never exhausts", () => expect(codeState({ ...base, usedCount: 99999 }, now)).toBe("ACTIVE"));
});

describe("checkRedeem", () => {
  const code = { ...base, courseIds: ["c1", "c2", "c3"] };
  const run = (over: Partial<Parameters<typeof checkRedeem>[0]> = {}) =>
    checkRedeem({ code, usedCourseIdsByStudent: [], enrolledCourseIds: [], ...over });

  it("NOT_FOUND for a missing code", () => expect(run({ code: null })).toEqual({ ok: false, reason: "NOT_FOUND" }));
  it("DISABLED", () => expect(run({ code: { ...code, isActive: false } })).toEqual({ ok: false, reason: "DISABLED" }));
  it("EXHAUSTED", () => expect(run({ code: { ...code, usageLimit: 1, usedCount: 1 } })).toEqual({ ok: false, reason: "EXHAUSTED" }));
  it("EXPIRED", () =>
    expect(run({ code: { ...code, expiresAt: new Date("2020-01-01") }, now: new Date("2026-01-01") })).toEqual({ ok: false, reason: "EXPIRED" }));

  it("unlocks every linked course", () => expect(run()).toEqual({ ok: true, courseIds: ["c1", "c2", "c3"] }));

  it("skips courses the student already used this code for", () =>
    expect(run({ usedCourseIdsByStudent: ["c1"] })).toEqual({ ok: true, courseIds: ["c2", "c3"] }));

  it("skips courses the student is already enrolled in", () =>
    expect(run({ enrolledCourseIds: ["c2"] })).toEqual({ ok: true, courseIds: ["c1", "c3"] }));

  it("ALREADY_USED when used for all linked courses", () =>
    expect(run({ usedCourseIdsByStudent: ["c1", "c2", "c3"] })).toEqual({ ok: false, reason: "ALREADY_USED" }));

  it("ALREADY_ENROLLED when enrolled in all unused courses", () =>
    expect(run({ usedCourseIdsByStudent: ["c1"], enrolledCourseIds: ["c2", "c3"] })).toEqual({ ok: false, reason: "ALREADY_ENROLLED" }));

  it("targets a single course", () => expect(run({ targetCourseId: "c2" })).toEqual({ ok: true, courseIds: ["c2"] }));
  it("NOT_FOR_COURSE when target is not linked", () => expect(run({ targetCourseId: "zz" })).toEqual({ ok: false, reason: "NOT_FOR_COURSE" }));
  it("ALREADY_USED for a targeted course used before", () =>
    expect(run({ targetCourseId: "c2", usedCourseIdsByStudent: ["c2"] })).toEqual({ ok: false, reason: "ALREADY_USED" }));
  it("ALREADY_ENROLLED for a targeted course already owned", () =>
    expect(run({ targetCourseId: "c2", enrolledCourseIds: ["c2"] })).toEqual({ ok: false, reason: "ALREADY_ENROLLED" }));

  it("state checks run before course checks", () =>
    expect(run({ code: { ...code, isActive: false }, targetCourseId: "zz" })).toEqual({ ok: false, reason: "DISABLED" }));

  it("has an Arabic message for every failure reason", () => {
    for (const r of ["NOT_FOUND", "DISABLED", "EXHAUSTED", "EXPIRED", "ALREADY_USED", "NOT_FOR_COURSE", "ALREADY_ENROLLED"] as const) {
      expect(REDEEM_ERRORS[r]).toMatch(/[؀-ۿ]/);
    }
  });
});
