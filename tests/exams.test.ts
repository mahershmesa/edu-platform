import { describe, expect, it } from "vitest";
import { gradeExam, shuffled, validateQuestion } from "@/lib/domain/exams";

const single = { id: "q1", points: 2, options: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: false }, { id: "c", isCorrect: false }] };
const multi = { id: "q2", points: 3, options: [{ id: "x", isCorrect: true }, { id: "y", isCorrect: true }, { id: "z", isCorrect: false }] };

describe("gradeExam", () => {
  it("scores a correct single-answer question", () => {
    const r = gradeExam([single], { q1: ["a"] }, 50);
    expect(r).toMatchObject({ score: 2, maxScore: 2, percent: 100, passed: true });
    expect(r.perQuestion.q1).toBe(true);
  });

  it("gives zero for a wrong single answer", () => {
    expect(gradeExam([single], { q1: ["b"] }, 50)).toMatchObject({ score: 0, percent: 0, passed: false });
  });

  it("requires the exact set for multiple-answer questions (all or nothing)", () => {
    expect(gradeExam([multi], { q2: ["x", "y"] }, 50).score).toBe(3);
    expect(gradeExam([multi], { q2: ["y", "x"] }, 50).score).toBe(3);
    expect(gradeExam([multi], { q2: ["x"] }, 50).score).toBe(0);
    expect(gradeExam([multi], { q2: ["x", "y", "z"] }, 50).score).toBe(0);
  });

  it("ignores invalid option ids and duplicates", () => {
    expect(gradeExam([single], { q1: ["a", "a", "nope"] }, 50).score).toBe(2);
    expect(gradeExam([multi], { q2: ["x", "x", "y", "ghost"] }, 50).score).toBe(3);
    expect(gradeExam([single], { q1: ["nope"] }, 50).score).toBe(0);
  });

  it("treats missing answers as wrong", () => {
    const r = gradeExam([single, multi], {}, 50);
    expect(r).toMatchObject({ score: 0, maxScore: 5, percent: 0, passed: false });
  });

  it("sums points and applies the pass threshold", () => {
    const r = gradeExam([single, multi], { q1: ["a"], q2: ["x"] }, 40);
    expect(r).toMatchObject({ score: 2, maxScore: 5, percent: 40, passed: true });
    expect(gradeExam([single, multi], { q1: ["a"], q2: ["x"] }, 41).passed).toBe(false);
  });

  it("handles an exam with zero questions", () => {
    expect(gradeExam([], {}, 50)).toMatchObject({ score: 0, maxScore: 0, percent: 0, passed: false });
  });

  it("never awards a question that has no correct option", () => {
    const broken = { id: "q3", points: 1, options: [{ id: "a", isCorrect: false }] };
    expect(gradeExam([broken], { q3: [] }, 0).score).toBe(0);
  });
});

describe("validateQuestion", () => {
  const o = (text: string, isCorrect = false) => ({ text, isCorrect });

  it("needs at least two filled options", () => {
    expect(validateQuestion("SINGLE", [o("أ", true)])).toBe("أضف خيارين على الأقل");
    expect(validateQuestion("SINGLE", [o("أ", true), o("  ")])).toBe("أضف خيارين على الأقل");
  });
  it("needs a correct answer", () => {
    expect(validateQuestion("SINGLE", [o("أ"), o("ب")])).toBe("حدد الإجابة الصحيحة");
  });
  it("single and true/false accept only one correct answer", () => {
    expect(validateQuestion("SINGLE", [o("أ", true), o("ب", true)])).toBe("هذا النوع يقبل إجابة صحيحة واحدة فقط");
    expect(validateQuestion("TRUE_FALSE", [o("صح", true), o("خطأ", true)])).toBe("هذا النوع يقبل إجابة صحيحة واحدة فقط");
  });
  it("true/false has exactly two options", () => {
    expect(validateQuestion("TRUE_FALSE", [o("صح", true), o("خطأ"), o("ربما")])).toBe("سؤال صح أو خطأ له خياران فقط");
  });
  it("accepts valid questions", () => {
    expect(validateQuestion("SINGLE", [o("أ", true), o("ب")])).toBeNull();
    expect(validateQuestion("MULTIPLE", [o("أ", true), o("ب", true), o("ج")])).toBeNull();
    expect(validateQuestion("TRUE_FALSE", [o("صح"), o("خطأ", true)])).toBeNull();
  });
});

describe("shuffled", () => {
  it("keeps the same elements and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffled(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("is deterministic for a fixed random source", () => {
    const rand = () => 0;
    expect(shuffled([1, 2, 3], rand)).toEqual([2, 3, 1]);
  });
});
