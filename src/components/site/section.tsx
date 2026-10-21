import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function Section({
  title,
  subtitle,
  href,
  hrefLabel = "عرض الكل",
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            {hrefLabel} <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
