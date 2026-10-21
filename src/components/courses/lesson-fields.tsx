"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Lesson } from "@prisma/client";
import { Checkbox, Field, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { parseYouTubeId, youtubeThumb } from "@/lib/youtube";
import { verifyYouTube } from "@/app/teacher/lessons/actions";

export function LessonFields({
  lesson,
  courses,
  pdfs,
  defaultCourseId,
}: {
  lesson?: Pick<Lesson, "courseId" | "title" | "youtubeId" | "description" | "sortOrder" | "durationMin" | "attachmentId" | "isFree" | "isPublished">;
  courses: { id: string; title: string }[];
  pdfs: { id: string; originalName: string }[];
  defaultCourseId?: string;
}) {
  const [url, setUrl] = useState(lesson ? `https://www.youtube.com/watch?v=${lesson.youtubeId}` : "");
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const videoId = parseYouTubeId(url);

  const verify = () =>
    start(async () => {
      const r = await verifyYouTube(url);
      if (!r.ok) return setStatus({ ok: false, text: r.error ?? "رابط غير صالح" });
      if (r.title && !title.trim()) setTitle(r.title);
      setStatus({ ok: true, text: r.title ? `تم التحقق: ${r.title}` : "الرابط صالح" });
    });

  return (
    <>
      <Field name="youtube" label="رابط يوتيوب" required hint="يمكن أن يكون الفيديو غير مدرج (Unlisted) على يوتيوب">
        <div className="flex gap-2">
          <input
            id="youtube"
            name="youtube"
            dir="ltr"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setStatus(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input"
          />
          <Button variant="secondary" onClick={verify} disabled={pending || !url.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحقق"}
          </Button>
        </div>
      </Field>
      {(status || videoId) && (
        <div className="flex items-center gap-3 rounded-xl bg-surface p-2.5">
          {videoId && <img src={youtubeThumb(videoId)} alt="" className="h-14 w-24 rounded-lg bg-line object-cover" />}
          <p className={`text-xs ${status && !status.ok ? "text-red-600" : "text-brand-700"}`}>
            {status ? (
              <span className="inline-flex items-center gap-1">
                {status.ok && <CheckCircle2 className="h-3.5 w-3.5" />} {status.text}
              </span>
            ) : (
              "اضغط تحقق لجلب عنوان الفيديو"
            )}
          </p>
        </div>
      )}
      <SelectField
        name="courseId"
        label="الدورة"
        required
        placeholder="اختر الدورة"
        defaultValue={lesson?.courseId ?? defaultCourseId ?? ""}
        options={courses.map((c) => ({ value: c.id, label: c.title }))}
      />
      <TextField name="title" label="عنوان الدرس" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="sortOrder"
          label="رقم الدرس (الترتيب)"
          type="number"
          min={0}
          defaultValue={lesson?.sortOrder ?? ""}
          hint={lesson ? undefined : "اتركه فارغاً ليُضاف في نهاية الدورة"}
        />
        <TextField name="durationMin" label="مدة الدرس (بالدقائق)" type="number" min={0} placeholder="مثال: 15" defaultValue={lesson?.durationMin ?? ""} />
      </div>
      <TextArea name="description" label="وصف الدرس" placeholder="اختياري" defaultValue={lesson?.description ?? ""} />
      <SelectField
        name="attachmentId"
        label="مرفق PDF"
        placeholder="بدون مرفق"
        defaultValue={lesson?.attachmentId ?? ""}
        options={pdfs.map((f) => ({ value: f.id, label: f.originalName }))}
        hint={pdfs.length === 0 ? "ارفع ملفات PDF من مكتبة الوسائط لتظهر هنا" : undefined}
      />
      <div className="space-y-2.5 rounded-xl border border-line p-3">
        <Checkbox name="isFree" label="درس مجاني (يظهر في صفحة الدورة لأي زائر بدون كود)" defaultChecked={lesson?.isFree ?? false} />
        <Checkbox name="isPublished" label="منشور (يظهر للطلاب المشتركين)" defaultChecked={lesson?.isPublished ?? true} />
      </div>
    </>
  );
}
