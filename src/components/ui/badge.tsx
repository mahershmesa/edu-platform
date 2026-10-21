import { cn } from "@/lib/utils";

const tones = {
  green: "bg-brand-50 text-brand-700 ring-brand-200",
  gray: "bg-surface text-muted ring-line",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "gray", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
