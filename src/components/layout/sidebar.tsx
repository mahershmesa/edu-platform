"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BadgeDollarSign,
  BookOpen,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Hash,
  Home,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  LogOut,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  PlayCircle,
  ScrollText,
  Settings,
  Shield,
  Smartphone,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import type { NavGroup } from "./nav";
import { logoutAction } from "@/app/(auth)/actions";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutGrid,
  teachers: Users,
  students: GraduationCap,
  enrollments: UserCheck,
  courses: BookOpen,
  categories: FolderOpen,
  banners: Layers,
  invoices: BadgeDollarSign,
  status: Activity,
  codes: Hash,
  app: Smartphone,
  staff: UserCog,
  roles: Shield,
  audit: ScrollText,
  settings: Settings,
  lessons: PlayCircle,
  exams: ClipboardList,
  media: ImageIcon,
  profile: UserRound,
};

export function Sidebar({
  groups,
  subtitle,
  userName,
  userRole,
}: {
  groups: NavGroup[];
  subtitle: string;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const rootHrefs = new Set(groups.flatMap((g) => g.items.map((i) => i.href)).filter((h) => h.split("/").length === 2));
  const isActive = (href: string) => (rootHrefs.has(href) ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  const content = (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 text-white">
      <div className={cn("flex items-center gap-3 px-4 pt-5 pb-4", collapsed && "lg:justify-center lg:px-2")}>
        <LogoMark className="h-11 w-11 shrink-0 text-white" />
        <div className={cn("min-w-0", collapsed && "lg:hidden")}>
          <p className="text-lg leading-tight font-extrabold">أساس أكاديمي</p>
          <p className="text-xs text-white/75">{subtitle}</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="mr-auto rounded-lg p-1.5 hover:bg-white/10 lg:hidden" aria-label="إغلاق القائمة">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className={cn("mx-3 mb-3 rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15", collapsed && "lg:hidden")}>
        <p className="truncate text-sm font-bold">{userName}</p>
        <p className="flex items-center gap-1.5 text-xs text-white/75">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {userRole}
        </p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className={cn("mb-1.5 px-2 text-[11px] font-semibold tracking-wide text-white/60", collapsed && "lg:hidden")}>{g.label}</p>
            <ul className="space-y-1">
              {g.items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutGrid;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold transition",
                        active ? "bg-white text-brand-700 shadow-sm" : "text-white/90 hover:bg-white/10",
                        collapsed && "lg:justify-center",
                      )}
                    >
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", active ? "bg-brand-50" : "bg-white/10")}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/15 p-3">
        <Link
          href="/"
          title="العودة إلى الموقع"
          className={cn("flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold hover:bg-white/10", collapsed && "lg:justify-center")}
        >
          <Home className="h-[18px] w-[18px]" />
          <span className={cn(collapsed && "lg:hidden")}>العودة إلى الموقع</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            title="تسجيل الخروج"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl bg-white/10 px-2.5 py-2 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20",
              collapsed && "lg:justify-center",
            )}
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className={cn(collapsed && "lg:hidden")}>تسجيل الخروج</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top-left menu button lives in the top bar via this fixed button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 right-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-line bg-white shadow-sm lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="h-5 w-5" />
      </button>
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 transition-[width] lg:block", collapsed ? "w-[88px]" : "w-72")}>
        {content}
        <button
          onClick={toggle}
          className="absolute top-6 -left-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-ink shadow"
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 max-w-[85vw] shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
