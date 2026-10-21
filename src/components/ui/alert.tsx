import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: { cls: "bg-sky-50 text-sky-800 border-sky-200", Icon: Info },
  success: { cls: "bg-brand-50 text-brand-800 border-brand-200", Icon: CheckCircle2 },
  warning: { cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: AlertTriangle },
  error: { cls: "bg-red-50 text-red-800 border-red-200", Icon: XCircle },
} as const;

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: React.ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}
