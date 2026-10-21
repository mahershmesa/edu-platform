"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";

const MAX = 20 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [group, setGroup] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      if (!ACCEPT.split(",").includes(f.type)) errs.push(`${f.name}: نوع غير مدعوم`);
      else if (f.size > MAX) errs.push(`${f.name}: أكبر من 20MB`);
      else next.push(f);
    }
    setFiles(next);
    setErrors(errs);
  };

  const reset = () => {
    setFiles([]);
    setGroup("");
    setIsPublic(false);
    setErrors([]);
  };

  const submit = async () => {
    setBusy(true);
    setErrors([]);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.set("groupName", group);
    if (isPublic) fd.set("isPublic", "on");
    try {
      const res = await fetch("/teacher/media/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { saved?: number; errors?: string[]; error?: string };
      if (data.error) setErrors([data.error]);
      if (data.errors?.length) setErrors(data.errors);
      if (data.saved) {
        toast(`تم رفع ${data.saved} ملف`);
        router.refresh();
        if (!data.errors?.length) {
          setOpen(false);
          reset();
        } else setFiles([]);
      }
    } catch {
      setErrors(["تعذر الاتصال بالخادم"]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> رفع ملفات
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) {
            setOpen(false);
            reset();
          }
        }}
        title="رفع ملفات جديدة"
        description="صور (JPG، PNG، WebP، GIF) أو ملفات PDF، حتى 20MB للملف"
      >
        <div className="space-y-4">
          {errors.length > 0 && (
            <Alert tone="error">
              <ul className="list-inside list-disc">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              add(e.dataTransfer.files);
            }}
            className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
              drag ? "border-brand-500 bg-brand-50" : "border-line hover:bg-surface"
            }`}
          >
            <FileUp className="h-8 w-8 text-muted" />
            <span className="font-semibold">انقر لاختيار الملفات أو اسحبها هنا</span>
            <span className="text-xs text-muted">حتى 20 ملفاً في المرة الواحدة</span>
          </button>
          <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => add(e.target.files)} />
          {files.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg bg-surface px-3 py-1.5">
                  <span className="truncate" dir="ltr">
                    {f.name}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {(f.size / 1024 / 1024).toFixed(2)}MB
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="إزالة">
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div>
            <label htmlFor="groupName" className="label">
              المجموعة (اختياري)
            </label>
            <input id="groupName" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="مثال: ملازم الفصل الأول" className="input" />
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            ملف عام (يمكن فتحه بالرابط من خارج المنصة)
          </label>
          <p className="text-xs text-muted">الملفات الخاصة لا يفتحها إلا أنت والطلاب المشتركون في الدورة التي أُرفق بها الملف.</p>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={busy}
            >
              إلغاء
            </Button>
            <Button onClick={submit} disabled={busy || files.length === 0}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع {files.length} ملف
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
