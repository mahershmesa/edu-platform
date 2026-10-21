import type { Metadata } from "next";
import { Hash, Info } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { CodesManager } from "@/components/codes/codes-manager";

export const metadata: Metadata = { title: "الأكواد" };

export default async function AdminCodesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requirePermission("codes.read");
  const params = await searchParams;
  const teacherId = sp(params, "teacherId");
  const teachers = await db.user.findMany({
    where: { type: "TEACHER" },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });
  const teacher = teachers.find((t) => t.id === teacherId);

  return (
    <>
      <PageHeader
        title="إدارة أكواد الدورات"
        description="كود واحد يمكن ربطه بعدة دورات لنفس المعلم، ويُستخدم مرة لكل طالب في كل دورة"
        icon={<Hash className="h-6 w-6" />}
      />
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="teacherId" className="label">
            اختيار المعلم
          </label>
          <select id="teacherId" name="teacherId" defaultValue={teacherId} className="input">
            <option value="">اختر المعلم</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.email ? `(${t.email})` : t.phone ? `(${t.phone})` : ""}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonClass()}>
          عرض الأكواد
        </button>
      </form>
      {teacher ? (
        <CodesManager
          teacherId={teacher.id}
          courseId={sp(params, "courseId")}
          q={sp(params, "q")}
          canWrite={can(user, "codes.write")}
          canDelete={can(user, "codes.delete")}
          hiddenParams={{ teacherId: teacher.id }}
        />
      ) : (
        <Alert tone="info" title="تعليمات">
          <span className="inline-flex items-center gap-1">
            <Info className="h-4 w-4" /> اختر المعلم أولاً لعرض دوراته وإدارة أكواد الوصول.
          </span>
        </Alert>
      )}
    </>
  );
}
