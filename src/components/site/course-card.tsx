/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BookOpen, PlayCircle } from "lucide-react";
import { formatIQD, formatNumber } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import type { CourseCardData } from "@/server/catalog";

export function CourseImage({ src, title, className = "" }: { src: string | null; title: string; className?: string }) {
  if (src) return <img src={src} alt={title} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-brand-600 to-brand-400 ${className}`}>
      <BookOpen className="h-10 w-10 text-white/80" aria-hidden />
    </div>
  );
}

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <CourseImage src={course.imageUrl} title={course.title} className="transition duration-300 group-hover:scale-105" />
        <span className="absolute top-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
          {course.category.name}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 leading-7 font-bold group-hover:text-brand-700">{course.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted">
          <Avatar name={course.teacher.name} src={course.teacher.avatarUrl} size={24} />
          <span className="truncate">{course.teacher.name}</span>
        </div>
        <div className="min-h-4 flex-1" />
        <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <PlayCircle className="h-4 w-4" /> {formatNumber(course._count.lessons)} درس
          </span>
          <span className="font-extrabold text-brand-700">{formatIQD(course.price)}</span>
        </div>
      </div>
    </Link>
  );
}

export function CourseGrid({ courses }: { courses: CourseCardData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}
