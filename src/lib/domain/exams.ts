export type GradableQuestion = {
  id: string;
  points: number;
  options: { id: string; isCorrect: boolean }[];
};

export type Answers = Record<string, string[]>;

/** All-or-nothing per question: the selected set must equal the correct set. */
export function gradeExam(questions: GradableQuestion[], answers: Answers, passPercent: number) {
  let score = 0;
  let maxScore = 0;
  const perQuestion: Record<string, boolean> = {};
  for (const q of questions) {
    maxScore += q.points;
    const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
    const valid = new Set(q.options.map((o) => o.id));
    const chosen = [...new Set((answers[q.id] ?? []).filter((id) => valid.has(id)))].sort();
    const ok = correct.length > 0 && correct.length === chosen.length && correct.every((id, i) => id === chosen[i]);
    perQuestion[q.id] = ok;
    if (ok) score += q.points;
  }
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  return { score, maxScore, percent, passed: percent >= passPercent, perQuestion };
}

export function shuffled<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Validate a question's options for its type. Returns an Arabic error or null. */
export function validateQuestion(type: "SINGLE" | "MULTIPLE" | "TRUE_FALSE", options: { text: string; isCorrect: boolean }[]) {
  const filled = options.filter((o) => o.text.trim() !== "");
  if (filled.length < 2) return "أضف خيارين على الأقل";
  const correct = filled.filter((o) => o.isCorrect).length;
  if (correct === 0) return "حدد الإجابة الصحيحة";
  if ((type === "SINGLE" || type === "TRUE_FALSE") && correct > 1) return "هذا النوع يقبل إجابة صحيحة واحدة فقط";
  if (type === "TRUE_FALSE" && filled.length !== 2) return "سؤال صح أو خطأ له خياران فقط";
  return null;
}

export const QUESTION_TYPE_LABELS = {
  SINGLE: "اختيار من متعدد (إجابة واحدة)",
  MULTIPLE: "اختيار من متعدد (عدة إجابات)",
  TRUE_FALSE: "صح أو خطأ",
} as const;
