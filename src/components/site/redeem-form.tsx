"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import type { ActionState } from "@/lib/action";
import { redeemAction } from "@/app/(site)/actions";

export function RedeemForm({ courseId, compact = false }: { courseId?: string; compact?: boolean }) {
  const [unlocked, setUnlocked] = useState<{ id: string; title: string }[] | null>(null);
  const action = redeemAction.bind(null, courseId ?? null);

  if (unlocked) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-800">
        <p className="flex items-center gap-2 font-bold">
          <CheckCircle2 className="h-5 w-5" /> تم تفعيل الكود بنجاح
        </p>
        <ul className="mt-3 space-y-2">
          {unlocked.map((c) => (
            <li key={c.id}>
              <Link href={`/courses/${c.id}`} className="font-semibold underline underline-offset-4">
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/my-courses" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
          الذهاب إلى دوراتي ←
        </Link>
      </div>
    );
  }

  return (
    <ActionForm
      action={action}
      onSuccess={(s: ActionState) => setUnlocked((s.data as { courses: { id: string; title: string }[] })?.courses ?? [])}
      className="space-y-3"
    >
      <label htmlFor="code" className="label">
        كود التفعيل
      </label>
      <div className={compact ? "space-y-3" : "flex flex-col gap-3 sm:flex-row"}>
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            id="code"
            name="code"
            required
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="مثال: AB3K9QX"
            dir="ltr"
            className="input h-12 pr-11 text-center font-mono text-lg tracking-[0.3em] uppercase placeholder:tracking-normal"
          />
        </div>
        <SubmitButton className="h-12 px-8 text-base" pendingText="جارٍ التفعيل...">
          تفعيل الكود
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
