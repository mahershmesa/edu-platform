"use client";

import { useState } from "react";
import { Plus, Printer } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { ActionForm, SubmitButton, type ServerAction } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { CopyButton } from "./copy-button";
import { CourseChecklist } from "./course-checklist";

export function CreateCodesDialog({
  action,
  courses,
  printHref,
  disabled,
}: {
  action: ServerAction;
  courses: { id: string; title: string }[];
  /** base print URL; the group name is appended as &group= */
  printHref: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [result, setResult] = useState<{ codes: string[]; group: string } | null>(null);
  const [group, setGroup] = useState("");

  const close = () => {
    setOpen(false);
    setResult(null);
    setKey((k) => k + 1);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="h-4 w-4" /> إنشاء أكواد جديدة
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="إنشاء أكواد جديدة"
        description="اختر دورة أو أكثر لنفس المعلم. الكود يعمل لأي دورة مرتبطة (مرة لكل طالب لكل دورة)."
      >
        {result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">تم إنشاء {result.codes.length} كود</p>
              <div className="flex gap-1">
                <CopyButton text={result.codes.join("\n")} label="نسخ الكل" />
                {result.group && (
                  <a
                    href={`${printHref}&group=${encodeURIComponent(result.group)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-semibold text-muted hover:bg-surface hover:text-ink"
                  >
                    <Printer className="h-4 w-4" /> طباعة المجموعة
                  </a>
                )}
              </div>
            </div>
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-xl bg-surface p-3 sm:grid-cols-3" dir="ltr">
              {result.codes.map((c) => (
                <code key={c} className="rounded-lg bg-white px-2 py-1.5 text-center font-mono text-sm font-bold tracking-widest ring-1 ring-line">
                  {c}
                </code>
              ))}
            </div>
            <div className="flex justify-end border-t border-line pt-4">
              <Button onClick={close}>تم</Button>
            </div>
          </div>
        ) : (
          <ActionForm
            key={key}
            action={action}
            className="space-y-4"
            onSuccess={(s: ActionState) => setResult({ codes: (s.data as { codes: string[] })?.codes ?? [], group })}
          >
            <CourseChecklist courses={courses} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="count" label="عدد الأكواد" type="number" min={1} max={1000} defaultValue={10} required />
              <TextField name="usageLimit" label="حد الاستخدام الكلي" type="number" min={1} placeholder="فارغ = بلا حد" hint="1 = كود لطالب واحد" defaultValue={1} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="groupName" label="اسم المجموعة" placeholder="مثال: دفعة آذار" hint="اختياري، يسهّل الطباعة والتتبع" onChange={(e) => setGroup(e.target.value.trim())} />
              <TextField name="expiresAt" label="تاريخ الانتهاء" type="date" hint="اختياري" />
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={close}>
                إلغاء
              </Button>
              <SubmitButton pendingText="جارٍ الإنشاء...">إنشاء الأكواد</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Dialog>
    </>
  );
}
