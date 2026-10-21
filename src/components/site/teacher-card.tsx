import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/format";

export function TeacherCard({
  teacher,
}: {
  teacher: { id: string; name: string; avatarUrl: string | null; bio: string | null; _count: { courses: number } };
}) {
  return (
    <Link
      href={`/teachers/${teacher.id}`}
      className="card group flex flex-col items-center p-5 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <Avatar name={teacher.name} src={teacher.avatarUrl} size={76} className="ring-4 ring-brand-50" />
      <p className="mt-3 font-bold group-hover:text-brand-700">{teacher.name}</p>
      {teacher.bio && <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{teacher.bio}</p>}
      <span className="mt-3 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        {formatNumber(teacher._count.courses)} دورة
      </span>
    </Link>
  );
}
