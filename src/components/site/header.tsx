import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoMark } from "@/components/layout/logo";
import { buttonClass } from "@/components/ui/button";
import { HeaderSearch } from "./header-search";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

export const SITE_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/courses", label: "الدورات" },
  { href: "/teachers", label: "المعلمون" },
  { href: "/redeem", label: "تفعيل كود" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const menuUser = user
    ? { name: user.name, avatarUrl: user.avatarUrl, type: user.type, contact: user.phone ?? user.email ?? "" }
    : null;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <MobileNav links={SITE_LINKS} user={menuUser} />
        <Link href="/" className="flex shrink-0 items-center gap-2 text-brand-700" aria-label="أساس أكاديمي - الرئيسية">
          <LogoMark className="h-9 w-9" />
          <span className="text-lg font-extrabold text-ink">أساس أكاديمي</span>
        </Link>
        <NavLinks links={SITE_LINKS} />
        <div className="mr-auto flex items-center gap-2">
          <HeaderSearch />
          {menuUser ? (
            <UserMenu user={menuUser} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className={buttonClass("ghost", "md")}>
                دخول
              </Link>
              <Link href="/register" className={buttonClass("primary", "md")}>
                إنشاء حساب
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
