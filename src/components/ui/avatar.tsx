/* eslint-disable @next/next/no-img-element */
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.36) };
  if (src) return <img src={src} alt={name} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  return (
    <span style={style} className={cn("grid shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white", className)}>
      {initials(name)}
    </span>
  );
}
