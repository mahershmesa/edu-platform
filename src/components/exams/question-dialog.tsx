"use client";

/* eslint-disable @next/next/no-img-element */
import { cloneElement, isValidElement, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton, type ServerAction } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, SelectField, TextArea, TextField } from "@/components/ui/field";
import { QUESTION_TYPE_LABELS } from "@/lib/domain/exams";

type QType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE";
type Opt = { key: number; text: string; isCorrect: boolean };

export type QuestionValues = {
  text: string;
  type: QType;
  points: number;
  imageUrl: string | null;
  options: { text: string; isCorrect: boolean }[];
};

let seq = 0;
const nextKey = () => ++seq;

function initialOptions(q?: QuestionValues): Opt[] {
  if (q?.options.length) return q.options.map((o) => ({ key: nextKey(), ...o }));
  return [
    { key: nextKey(), text: "", isCorrect: false },
    { key: nextKey(), text: "", isCorrect: false },
  ];
}

function QuestionForm({ question, onCancel }: { question?: QuestionValues; onCancel: () => void }) {
  const [type, setType] = useState<QType>(question?.type ?? "SINGLE");
  const [options, setOptions] = useState<Opt[]>(() => initialOptions(question));
  // Controlled so values survive React's form reset after a failed submit.
  const [text, setText] = useState(question?.text ?? "");
  const [points, setPoints] = useState(String(question?.points ?? 1));

  const changeType = (t: QType) => {
    setType(t);
    if (t === "TRUE_FALSE") {
      const trueCorrect = options[0]?.isCorrect ?? true;
      setOptions([
        { key: nextKey(), text: "صح", isCorrect: trueCorrect },
        { key: nextKey(), text: "خطأ", isCorrect: !trueCorrect },
      ]);
    } else if (type === "TRUE_FALSE") {
      setOptions(initialOptions());
    } else if (t === "SINGLE") {
      // keep only the first correct option
      let seen = false;
      setOptions((os) => os.map((o) => ({ ...o, isCorrect: o.isCorrect && !seen ? ((seen = true), true) : false })));
    }
  };

  const markCorrect = (key: number, checked: boolean) => {
    setOptions((os) =>
      os.map((o) => (type === "MULTIPLE" ? (o.key === key ? { ...o, isCorrect: checked } : o) : { ...o, isCorrect: o.key === key })),
    );
  };

  return (
    <div className="space-y-4">
      <TextArea name="text" label="نص السؤال" required value={text} onChange={(e) => setText(e.target.value)} rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="type"
          label="نوع السؤال"
          value={type}
          onChange={(e) => changeType(e.target.value as QType)}
          options={(Object.keys(QUESTION_TYPE_LABELS) as QType[]).map((k) => ({ value: k, label: QUESTION_TYPE_LABELS[k] }))}
        />
        <TextField name="points" label="النقاط" type="number" min={1} max={100} value={points} onChange={(e) => setPoints(e.target.value)} />
      </div>

      <Field name="image" label="صورة للسؤال (اختياري)" hint="JPG أو PNG أو WebP، حتى 5MB. أو ضع رابط صورة.">
        <div className="space-y-2">
          {question?.imageUrl && (
            <div className="flex items-center gap-3">
              <img src={question.imageUrl} alt="" className="h-16 w-24 rounded-lg border border-line object-cover" />
              <Checkbox name="removeImage" label="إزالة الصورة الحالية" />
            </div>
          )}
          <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input py-2 text-xs" />
          <input name="imageUrl" dir="ltr" placeholder="https://... (اختياري)" className="input" />
        </div>
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="label mb-0">
            خيارات الإجابة <span className="text-xs font-normal text-muted">({type === "MULTIPLE" ? "حدد كل الإجابات الصحيحة" : "حدد الإجابة الصحيحة"})</span>
          </p>
          {type !== "TRUE_FALSE" && options.length < 8 && (
            <Button size="sm" variant="secondary" onClick={() => setOptions((os) => [...os, { key: nextKey(), text: "", isCorrect: false }])}>
              <Plus className="h-3.5 w-3.5" /> إضافة خيار
            </Button>
          )}
        </div>
        <ul className="space-y-2">
          {options.map((o, i) => (
            <li key={o.key} className="flex items-center gap-2">
              <input
                type={type === "MULTIPLE" ? "checkbox" : "radio"}
                name="correct"
                value={i}
                checked={o.isCorrect}
                onChange={(e) => markCorrect(o.key, e.target.checked)}
                className="h-5 w-5 shrink-0 accent-brand-600"
                aria-label={`الخيار ${i + 1} صحيح`}
              />
              <input
                name="optionText"
                value={o.text}
                readOnly={type === "TRUE_FALSE"}
                onChange={(e) => setOptions((os) => os.map((x) => (x.key === o.key ? { ...x, text: e.target.value } : x)))}
                placeholder={`الخيار ${i + 1}`}
                className={`input ${o.isCorrect ? "border-brand-400 bg-brand-50/50" : ""}`}
              />
              {type !== "TRUE_FALSE" && options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="حذف الخيار"
                  className="text-red-600"
                  onClick={() => setOptions((os) => os.filter((x) => x.key !== o.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
        <SubmitButton>حفظ السؤال</SubmitButton>
      </div>
    </div>
  );
}

/** Trigger + dialog for adding/editing a question. */
export function QuestionDialog({
  trigger,
  title,
  action,
  question,
}: {
  trigger: React.ReactElement<{ onClick?: () => void }>;
  title: string;
  action: ServerAction;
  question?: QuestionValues;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const close = () => {
    setOpen(false);
    setKey((k) => k + 1);
  };
  return (
    <>
      {isValidElement(trigger) ? cloneElement(trigger, { onClick: () => setOpen(true) }) : trigger}
      <Dialog open={open} onClose={close} title={title} size="lg">
        <ActionForm key={key} action={action} onSuccess={close}>
          <QuestionForm question={question} onCancel={close} />
        </ActionForm>
      </Dialog>
    </>
  );
}
