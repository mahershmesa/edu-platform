"use client";

import Link from "next/link";
import { InstallAppButton } from "@/components/pwa/install-app";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, LayoutGrid, LogIn, LogOut, Menu, UserPlus, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/app/(auth)/actions";
import { LogoMark } from "@/components/layout/logo";
import { isLinkActive } from "./nav-links";
import { dashboardFor, type MenuUser } from "./user-menu";

export function MobileNav({ links, user }: { links: { href: string; label: string }[]; user: MenuUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const dash = user ? dashboardFor(user.type) : null;
  const row = "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink hover:bg-surface lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[86vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="flex items-center gap-2 font-extrabold text-brand-700">
                <LogoMark className="h-8 w-8" /> <span className="text-ink">أساس أكاديمي</span>
              </span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-surface" aria-label="إغلاق القائمة">
                <X className="h-5 w-5" />
              </button>
            </div>
            {user && (
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Avatar name={user.name} src={user.avatarUrl} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.name}</p>
                  <p className="truncate text-xs text-muted" dir="ltr">
                    {user.contact}
                  </p>
                </div>
              </div>
            )}
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(row, isLinkActive(pathname, l.href) ? "bg-brand-50 text-brand-700" : "hover:bg-surface")}
                >
                  {l.label}
                </Link>
              ))}
              {user && <div className="my-2 border-t border-line" />}
              {dash && (
                <Link href={dash.href} className={cn(row, "hover:bg-surface")}>
                  <LayoutGrid className="h-5 w-5 text-brand-600" /> {dash.label}
                </Link>
              )}
              {user?.type === "STUDENT" && (
                <Link href="/my-courses" className={cn(row, "hover:bg-surface")}>
                  <BookOpen className="h-5 w-5 text-brand-600" /> دوراتي
                </Link>
              )}
              {user && (
                <Link href="/account" className={cn(row, "hover:bg-surface")}>
                  <UserRound className="h-5 w-5 text-brand-600" /> حسابي
                </Link>
              )}
            </nav>
            <div className="px-3 pb-3">
              <InstallAppButton className="w-full justify-center py-3" />
            </div>
            <div className="border-t border-line p-3">
              {user ? (
                <form action={logoutAction}>
                  <button type="submit" className={cn(row, "w-full text-red-600 hover:bg-red-50")}>
                    <LogOut className="h-5 w-5" /> تسجيل الخروج
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 font-semibold">
                    <LogIn className="h-4 w-4" /> دخول
                  </Link>
                  <Link href="/register" className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white">
                    <UserPlus className="h-4 w-4" /> حساب جديد
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
