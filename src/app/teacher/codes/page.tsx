import type { Metadata } from "next";
import { Hash } from "lucide-react";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { CodesManager } from "@/components/codes/codes-manager";

export const metadata: Metadata = { title: "الأكواد" };

export default async function TeacherCodesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const editable = teacherCanEdit(user);
  return (
    <>
      <PageHeader
        title="أكواد دوراتي"
        description="أنشئ أكواداً وبِعها لطلابك. الكود يفتح الدورات المرتبطة به، مرة واحدة لكل طالب في كل دورة"
        icon={<Hash className="h-6 w-6" />}
      />
      <CodesManager teacherId={user.id} courseId={sp(params, "courseId")} q={sp(params, "q")} canWrite={editable} canDelete={editable} />
    </>
  );
}
