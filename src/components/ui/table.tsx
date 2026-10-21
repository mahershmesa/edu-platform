import { cn } from "@/lib/utils";

/** Horizontally scrollable table wrapper so wide tables never break the page on phones. */
export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-line", className)}>
      <table className="table-base">{children}</table>
    </div>
  );
}
