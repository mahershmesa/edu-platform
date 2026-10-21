"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { setLessonCompleted } from "@/app/(site)/actions";

export function CompleteButton({ lessonId, completed, nextHref }: { lessonId: string; completed: boolean; nextHref?: string | null }) {
  const [done, setDone] = useState(completed);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setLessonCompleted(lessonId, !done);
          if (!res.ok) return toast(res.error ?? "حدث خطأ", "error");
          setDone(!done);
          toast(res.message ?? "تم");
          if (!done && nextHref) router.push(nextHref);
          else router.refresh();
        })
      }
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold transition disabled:opacity-60",
        done ? "border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100" : "bg-brand-600 text-white hover:bg-brand-700",
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {done ? "تم إنهاء الدرس" : nextHref ? "تم الإنهاء، الدرس التالي" : "تحديد كمنتهٍ"}
    </button>
  );
}
