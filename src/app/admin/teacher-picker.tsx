"use client";

import { useRouter } from "next/navigation";
import { UserRoundSearch } from "lucide-react";

/** Quick jump to a teacher's summary page (where the admin can enter teacher view). */
export function TeacherPicker({ teachers }: { teachers: { id: string; name: string }[] }) {
  const router = useRouter();
  return (
    <label className="relative hidden md:block">
      <span className="sr-only">اختر معلماً للعرض</span>
      <UserRoundSearch className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
      <select
        defaultValue=""
        onChange={(e) => e.target.value && router.push(`/admin/teachers/${e.target.value}`)}
        className="input h-10 w-56 py-0 pr-9 text-sm"
      >
        <option value="">اختر معلماً للعرض</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
