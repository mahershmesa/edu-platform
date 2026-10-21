import { cn } from "@/lib/utils";

const tones = {
  green: "bg-brand-600",
  teal: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  purple: "bg-violet-500",
} as const;

export function StatCard({
  label,
  value,
  icon,
  tone = "green",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: keyof typeof tones;
  hint?: React.ReactNode;
}) {
  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm", tones[tone])}>{icon}</span>
    </div>
  );
}
