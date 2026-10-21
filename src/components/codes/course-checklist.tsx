"use client";

import { useContext, useState } from "react";
import { FormStateContext } from "@/components/ui/form-context";

/** Scrollable checkbox list of courses posted as repeated `courseIds` fields. */
export function CourseChecklist({
  courses,
  defaultSelected = [],
}: {
  courses: { id: string; title: string }[];
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const error = useContext(FormStateContext)?.fieldErrors?.courseIds;
  const allOn = courses.length > 0 && selected.length === courses.length;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">
          الدورات المرتبطة <span className="text-red-500">*</span>
        </span>
        {courses.length > 1 && (
          <button
            type="button"
            onClick={() => setSelected(allOn ? [] : courses.map((c) => c.id))}
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            {allOn ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </button>
        )}
      </div>
      <div className={`max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2 ${error ? "border-red-400" : "border-line"}`}>
        {courses.length === 0 && <p className="p-2 text-sm text-muted">لا توجد دورات لهذا المعلم بعد.</p>}
        {courses.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface">
            <input
              type="checkbox"
              name="courseIds"
              value={c.id}
              checked={selected.includes(c.id)}
              onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
              className="h-4 w-4 accent-brand-600"
            />
            {c.title}
          </label>
        ))}
      </div>
      <p className={`mt-1 text-xs ${error ? "text-red-600" : "text-muted"}`}>
        {error ?? `المحدد: ${selected.length}. الكود يفتح أي دورة مرتبطة، مرة واحدة لكل طالب في كل دورة.`}
      </p>
    </div>
  );
}
