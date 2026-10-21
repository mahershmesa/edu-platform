"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function isLinkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition",
            isLinkActive(pathname, l.href) ? "bg-brand-50 text-brand-700" : "text-ink/80 hover:bg-surface hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
