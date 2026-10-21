"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, LayoutGrid, LogOut, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/app/(auth)/actions";

export type MenuUser = { name: string; avatarUrl: string | null; type: string; contact: string };

export function dashboardFor(type: string): { href: string; label: string } | null {
  if (type === "ADMIN" || type === "STAFF") return { href: "/admin", label: "لوحة الإدارة" };
  if (type === "TEACHER") return { href: "/teacher", label: "لوحة المعلم" };
  return null;
}

export function UserMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const dash = dashboardFor(user.type);
  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-line bg-white py-1 pr-1 pl-2 hover:bg-surface"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={32} />
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">{user.name}</span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-xl">
          <div className="border-b border-line px-3 pt-1 pb-2.5">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted" dir="ltr">
              {user.contact}
            </p>
          </div>
          <div className="py-1" onClick={() => setOpen(false)}>
            {dash && (
              <Link href={dash.href} className={item}>
                <LayoutGrid className="h-4 w-4 text-brand-600" /> {dash.label}
              </Link>
            )}
            {user.type === "STUDENT" && (
              <Link href="/my-courses" className={item}>
                <BookOpen className="h-4 w-4 text-brand-600" /> دوراتي
              </Link>
            )}
            <Link href="/account" className={item}>
              <UserRound className="h-4 w-4 text-brand-600" /> حسابي
            </Link>
          </div>
          <form action={logoutAction} className="border-t border-line pt-1">
            <button type="submit" className={`${item} w-full text-red-600`}>
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
