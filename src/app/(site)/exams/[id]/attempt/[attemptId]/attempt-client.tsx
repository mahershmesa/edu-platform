"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { saveAnswers, submitAttempt } from "../../actions";

export type AttemptQuestion = {
  id: string;
  text: string;
  imageUrl: string | null;
  type: "SINGLE" | "MULTIPLE" | "TRUE_FALSE";
  points: number;
  options: { id: string; text: string }[];
};

type Answers = Record<string, string[]>;

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function AttemptClient({
  attemptId,
  examTitle,
  questions,
  initialAnswers,
  deadline,
  serverNow,
}: {
  attemptId: string;
  examTitle: string;
  questions: AttemptQuestion[];
  initialAnswers: Answers;
  deadline: string;
  serverNow: string;
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Clock skew correction: server time minus client time when the page rendered.
  const skew = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const deadlineMs = useMemo(() => new Date(deadline).getTime(), [deadline]);
  const [remaining, setRemaining] = useState(() => deadlineMs - (Date.now() + skew));

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startSubmit(async () => {
      await submitAttempt(attemptId, answersRef.current);
    });
  }, [attemptId]);

  useEffect(() => {
    const t = setInterval(() => {
      const left = deadlineMs - (Date.now() + skew);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        doSubmit();
      }
    }, 500);
    return () => clearInterval(t);
  }, [deadlineMs, skew, doSubmit]);

  // Debounced autosave whenever answers change.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const r = await saveAnswers(attemptId, answersRef.current);
        if (r.closed) doSubmit();
        setSaveState(r.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [answers, attemptId, doSubmit]);

  const q = questions[index];
  const answeredCount = questions.filter((x) => (answers[x.id]?.length ?? 0) > 0).length;
  const unanswered = questions.length - answeredCount;
  const low = remaining < 60_000;

  const choose = (optionId: string) => {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (q.type === "MULTIPLE") {
        const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
        return { ...prev, [q.id]: next };
      }
      return { ...prev, [q.id]: [optionId] };
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="sticky top-2 z-20 mb-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <p className="truncate font-bold">{examTitle}</p>
          <p className="text-xs text-muted">
            أجبت عن {formatNumber(answeredCount)} من {formatNumber(questions.length)} ·{" "}
            {saveState === "saving" ? "جارٍ الحفظ..." : saveState === "saved" ? "تم الحفظ" : saveState === "error" ? "تعذّر الحفظ، تحقق من الاتصال" : "تُحفظ إجاباتك تلقائياً"}
          </p>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold tabular-nums",
            low ? "animate-pulse bg-red-50 text-red-700" : "bg-brand-50 text-brand-800",
          )}
          dir="ltr"
          aria-live="polite"
        >
          <Clock className="h-4 w-4" /> {formatClock(remaining)}
        </div>
      </div>

      <div className="card p-5 sm:p-7">
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span>
            السؤال {formatNumber(index + 1)} من {formatNumber(questions.length)}
          </span>
          <span>
            {formatNumber(q.points)} نقطة {q.type === "MULTIPLE" && "· اختر كل الإجابات الصحيحة"}
          </span>
        </div>
        <h2 className="text-lg leading-8 font-bold whitespace-pre-line">{q.text}</h2>
        {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-3 max-h-72 rounded-xl border border-line" />}
        <ul className="mt-5 space-y-2.5" role={q.type === "MULTIPLE" ? "group" : "radiogroup"}>
          {q.options.map((o) => {
            const selected = answers[q.id]?.includes(o.id) ?? false;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  role={q.type === "MULTIPLE" ? "checkbox" : "radio"}
                  aria-checked={selected}
                  onClick={() => choose(o.id)}
                  disabled={submitting}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-right transition",
                    selected ? "border-brand-500 bg-brand-50 font-semibold" : "border-line hover:border-brand-200 hover:bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center border-2",
                      q.type === "MULTIPLE" ? "rounded-md" : "rounded-full",
                      selected ? "border-brand-600 bg-brand-600 text-white" : "border-line",
                    )}
                  >
                    {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </span>
                  {o.text}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          {index < questions.length - 1 ? (
            <Button onClick={() => setIndex((i) => i + 1)}>
              التالي <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
              <Send className="h-4 w-4" /> تسليم الامتحان
            </Button>
          )}
        </div>
      </div>

      <div className="card mt-5 p-4">
        <p className="mb-3 text-sm font-semibold">الانتقال بين الأسئلة</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((x, i) => {
            const done = (answers[x.id]?.length ?? 0) > 0;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-10 w-10 rounded-xl border text-sm font-bold tabular-nums transition",
                  i === index ? "border-brand-600 ring-4 ring-brand-100" : "border-line",
                  done ? "bg-brand-600 text-white" : "bg-white text-ink hover:bg-surface",
                )}
                aria-label={`السؤال ${i + 1}${done ? " (مُجاب)" : ""}`}
              >
                {formatNumber(i + 1)}
              </button>
            );
          })}
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setConfirmOpen(true)} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} تسليم الامتحان
        </Button>
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="تسليم الامتحان" size="sm">
        <p className="text-sm leading-7 text-muted">
          {unanswered > 0
            ? `لم تجب عن ${formatNumber(unanswered)} سؤال. هل تريد التسليم الآن؟ لا يمكن تعديل الإجابات بعد التسليم.`
            : "أجبت عن كل الأسئلة. هل تريد تسليم الامتحان؟ لا يمكن تعديل الإجابات بعد التسليم."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            مراجعة الإجابات
          </Button>
          <Button onClick={doSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} تسليم
          </Button>
        </div>
      </Dialog>

      {submitting && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تسليم الامتحان وتصحيحه...
          </div>
        </div>
      )}
    </div>
  );
}
