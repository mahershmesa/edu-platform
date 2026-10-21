import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { TEACHER_NAV } from "@/components/layout/nav";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacher();
  const editable = teacherCanEdit(user);
  return (
    <>
      {user.impersonator && <ImpersonationBanner adminName={user.impersonator.name} teacherName={user.name} />}
      <div className="flex min-h-dvh">
        <Sidebar groups={TEACHER_NAV} subtitle="لوحة المعلم" userName={user.name} userRole="معلم" />
        <div className="min-w-0 flex-1">
          <TopBar section="لوحة المعلم" sectionHref="/teacher" userName={user.name} userRole="معلم" avatarUrl={user.avatarUrl} />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
            {!editable && (
              <Alert tone="warning" title="حسابك موقوف مؤقتاً" className="mb-6">
                {user.billingSuspended ? (
                  <>
                    لديك فاتورة متأخرة. لا يمكنك إضافة أو تعديل المحتوى والأكواد حتى يتم الدفع، وطلابك الحاليون يستمرون في المشاهدة.{" "}
                    <Link href="/teacher/invoices" className="font-semibold underline">
                      عرض الفواتير
                    </Link>
                  </>
                ) : (
                  "أوقفت الإدارة حسابك. لا يمكنك إضافة أو تعديل المحتوى حالياً. تواصل مع إدارة المنصة."
                )}
              </Alert>
            )}
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
