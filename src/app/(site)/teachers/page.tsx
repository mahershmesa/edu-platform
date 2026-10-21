import type { Metadata } from "next";
import { featuredTeachers } from "@/server/catalog";
import { TeacherCard } from "@/components/site/teacher-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "المعلمون", description: "تعرّف على معلمي المنصة ودوراتهم" };

export default async function TeachersPage() {
  const teachers = await featuredTeachers();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">المعلمون</h1>
      <p className="mt-1 text-sm text-muted">اختر معلمك وتصفّح دوراته</p>
      <div className="mt-6">
        {teachers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {teachers.map((t) => (
              <TeacherCard key={t.id} teacher={t} />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState title="لا يوجد معلمون بعد" />
          </div>
        )}
      </div>
    </div>
  );
}
