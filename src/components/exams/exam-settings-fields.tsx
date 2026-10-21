"use client";

import { useState } from "react";
import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/field";

export type CourseOption = { id: string; title: string; lessons: { id: string; title: string }[] };

type ExamValues = {
  title?: string;
  description?: string | null;
  durationMin?: number;
  passPercent?: number;
  maxAttempts?: number | null;
  shuffle?: boolean;
  showAnswers?: boolean;
  isActive?: boolean;
  lessonId?: string | null;
};

/**
 * Exam settings form fields. When `courses` is given the teacher picks the course first
 * (create flow); otherwise `lessons` of the fixed course are offered.
 */
export function ExamSettingsFields({
  exam,
  courses,
  lessons,
}: {
  exam?: ExamValues;
  courses?: CourseOption[];
  lessons?: { id: string; title: string }[];
}) {
  const [courseId, setCourseId] = useState(courses?.length === 1 ? courses[0].id : "");
  const lessonOptions = courses ? (courses.find((c) => c.id === courseId)?.lessons ?? []) : (lessons ?? []);

  return (
    <div className="space-y-4">
      {courses && (
        <SelectField
          name="courseId"
          label="الدورة"
          required
          placeholder="اختر الدورة"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          options={courses.map((c) => ({ value: c.id, label: c.title }))}
        />
      )}
      <TextField name="title" label="عنوان الامتحان" required defaultValue={exam?.title} placeholder="مثال: امتحان الفصل الأول" />
      <TextArea name="description" label="وصف الامتحان" defaultValue={exam?.description ?? ""} placeholder="تعليمات للطالب (اختياري)" />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="durationMin" label="المدة (بالدقائق)" type="number" min={1} max={600} required defaultValue={exam?.durationMin ?? 60} />
        <TextField name="passPercent" label="درجة النجاح %" type="number" min={1} max={100} required defaultValue={exam?.passPercent ?? 50} />
        <TextField
          name="maxAttempts"
          label="عدد المحاولات"
          type="number"
          min={1}
          defaultValue={exam?.maxAttempts ?? ""}
          placeholder="فارغ = بلا حد"
        />
      </div>
      <SelectField
        key={courseId}
        name="lessonId"
        label="ربط بدرس (اختياري)"
        placeholder={courses && !courseId ? "اختر الدورة أولاً" : "بدون ربط بدرس — امتحان للدورة كاملة"}
        defaultValue={exam?.lessonId ?? ""}
        disabled={!!courses && !courseId}
        options={lessonOptions.map((l) => ({ value: l.id, label: l.title }))}
      />
      <div className="grid gap-3 rounded-xl border border-line bg-surface/60 p-4 sm:grid-cols-3">
        <Checkbox name="shuffle" label="ترتيب عشوائي للأسئلة والخيارات" defaultChecked={exam?.shuffle ?? false} />
        <Checkbox name="showAnswers" label="إظهار الإجابات الصحيحة بعد التسليم" defaultChecked={exam?.showAnswers ?? true} />
        <Checkbox name="isActive" label="الامتحان متاح للطلاب" defaultChecked={exam?.isActive ?? false} />
      </div>
    </div>
  );
}
