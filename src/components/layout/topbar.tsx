import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function TopBar({
  section,
  sectionHref,
  userName,
  userRole,
  avatarUrl,
  children,
}: {
  section: string;
  sectionHref: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 pr-16 pl-4 sm:pl-6 lg:pr-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted" aria-label="المسار">
          <Link href={sectionHref} className="font-semibold text-brand-700 hover:underline">
            {section}
          </Link>
          <ChevronLeft className="h-4 w-4" />
        </nav>
        <div className="flex items-center gap-3">
          {children}
          <div className="hidden items-center gap-2.5 rounded-2xl border border-line bg-white px-3 py-1.5 sm:flex">
            <div className="text-left leading-tight">
              <p className="text-sm font-bold">{userName}</p>
              <p className="text-xs text-muted">{userRole}</p>
            </div>
            <Avatar name={userName} src={avatarUrl} size={34} />
          </div>
        </div>
      </div>
    </header>
  );
}
