"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies text (absolute URL when `absolute`) to the clipboard. */
export function CopyButton({ text, absolute = false, label = "نسخ الرابط", className }: { text: string; absolute?: boolean; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={async () => {
        const value = absolute ? new URL(text, window.location.origin).toString() : text;
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          window.prompt(label, value);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn("inline-grid h-9 w-9 place-items-center rounded-lg text-sky-600 transition hover:bg-sky-50", className)}
    >
      {copied ? <Check className="h-4 w-4 text-brand-600" /> : <Link2 className="h-4 w-4" />}
    </button>
  );
}
