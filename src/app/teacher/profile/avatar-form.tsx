"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { ActionForm, SubmitButton, type ServerAction } from "@/components/ui/action-form";

export function AvatarForm({ action }: { action: ServerAction }) {
  const [name, setName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <ActionForm action={action} resetOnSuccess onSuccess={() => setName(null)} className="space-y-3">
      <input
        ref={input}
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? null)}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm font-semibold hover:bg-surface"
      >
        <Upload className="h-4 w-4" /> {name ?? "اختيار صورة"}
      </button>
      <p className="text-xs text-muted">JPG أو PNG أو WebP، حتى 5MB</p>
      {name && <SubmitButton className="w-full">رفع الصورة</SubmitButton>}
    </ActionForm>
  );
}
