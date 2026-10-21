/* eslint-disable @next/next/no-img-element */
import { ArrowDown, ArrowUp, Eye, EyeOff, Paperclip, Pencil, Trash2 } from "lucide-react";
import type { Lesson } from "@prisma/client";
import { formatDuration } from "@/lib/format";
import { youtubeThumb } from "@/lib/youtube";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { LessonFields } from "./lesson-fields";
import { CopyButton } from "./copy-button";
import { deleteLesson, moveLesson, toggleLessonPublished, updateLesson } from "@/app/teacher/lessons/actions";

type Row = Lesson & { course: { id: string; title: string }; attachment: { originalName: string } | null };

/** Lessons list with teacher actions. `reorder` shows up/down buttons (use when listing one course in order). */
export function LessonList({
  lessons,
  courses,
  pdfs,
  editable,
  reorder = false,
}: {
  lessons: Row[];
  courses: { id: string; title: string }[];
  pdfs: { id: string; originalName: string }[];
  editable: boolean;
  reorder?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {lessons.map((l, i) => (
        <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3 sm:flex-nowrap">
          <img src={youtubeThumb(l.youtubeId)} alt="" className="h-16 w-28 shrink-0 rounded-lg bg-surface object-cover" loading="lazy" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              <span className="text-muted tabular-nums">{l.sortOrder}. </span>
              {l.title}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>{l.course.title}</span>
              <span>{formatDuration(l.durationMin)}</span>
              {l.attachment && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {l.attachment.originalName}
                </span>
              )}
            </p>
            <div className="mt-1.5 flex gap-1">
              <Badge tone={l.isPublished ? "green" : "gray"}>{l.isPublished ? "منشور" : "غير منشور"}</Badge>
              {l.isFree && <Badge tone="blue">مجاني</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {editable && reorder && (
              <>
                <ActionButton action={moveLesson.bind(null, l.id, "up")} variant="ghost" size="icon" className={i === 0 ? "invisible" : ""}>
                  <ArrowUp className="h-4 w-4" />
                  <span className="sr-only">تحريك للأعلى</span>
                </ActionButton>
                <ActionButton
                  action={moveLesson.bind(null, l.id, "down")}
                  variant="ghost"
                  size="icon"
                  className={i === lessons.length - 1 ? "invisible" : ""}
                >
                  <ArrowDown className="h-4 w-4" />
                  <span className="sr-only">تحريك للأسفل</span>
                </ActionButton>
              </>
            )}
            <CopyButton text={`/learn/${l.course.id}/${l.id}`} absolute label="نسخ رابط الدرس" />
            {editable && (
              <>
                <ActionButton action={toggleLessonPublished.bind(null, l.id)} variant={l.isPublished ? "secondary" : "primary"}>
                  {l.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {l.isPublished ? "إلغاء النشر" : "نشر"}
                </ActionButton>
                <FormDialog
                  title={`تعديل: ${l.title}`}
                  action={updateLesson.bind(null, l.id)}
                  size="lg"
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="تعديل">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                >
                  <LessonFields lesson={l} courses={courses} pdfs={pdfs} />
                </FormDialog>
                <ConfirmAction
                  title="حذف الدرس"
                  message={`حذف "${l.title}" نهائياً؟ سيُحذف تقدم الطلاب في هذا الدرس.`}
                  action={deleteLesson.bind(null, l.id)}
                  confirmLabel="حذف"
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="حذف" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                />
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
