import { requireAdminArea } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ADMIN_NAV } from "@/components/layout/nav";
import { TeacherPicker } from "./teacher-picker";
import { db } from "@/lib/db";
import { can } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminArea();
  const groups = ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (i.systemAdminOnly ? user.type === "ADMIN" : !i.perm || can(user, i.perm))),
  })).filter((g) => g.items.length > 0);
  const roleLabel = user.type === "ADMIN" ? "مدير النظام" : "موظف إدارة";
  const teachers = can(user, "teachers.impersonate")
    ? await db.user.findMany({ where: { type: "TEACHER" }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  return (
    <div className="flex min-h-dvh">
      <Sidebar groups={groups} subtitle="لوحة الإدارة" userName={user.name} userRole={roleLabel} />
      <div className="min-w-0 flex-1">
        <TopBar section="لوحة الإدارة" sectionHref="/admin" userName={user.name} userRole={roleLabel} avatarUrl={user.avatarUrl}>
          {teachers.length > 0 && <TeacherPicker teachers={teachers} />}
        </TopBar>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
