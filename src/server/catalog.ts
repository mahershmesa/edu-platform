import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Courses visible on the public site. Courses of suspended teachers stay visible. */
export const publicCourseWhere: Prisma.CourseWhereInput = { status: "PUBLISHED" };

export const courseCardSelect = {
  id: true,
  title: true,
  price: true,
  imageUrl: true,
  teacher: { select: { id: true, name: true, avatarUrl: true } },
  category: { select: { id: true, name: true } },
  _count: { select: { lessons: { where: { isPublished: true } } } },
} satisfies Prisma.CourseSelect;

export type CourseCardData = Prisma.CourseGetPayload<{ select: typeof courseCardSelect }>;

export async function latestCourses(take = 8) {
  return db.course.findMany({ where: publicCourseWhere, select: courseCardSelect, orderBy: { createdAt: "desc" }, take });
}

export async function activeCategories() {
  return db.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
}

/** Teachers that have at least one published course. */
export async function featuredTeachers(take?: number) {
  return db.user.findMany({
    where: { type: "TEACHER", courses: { some: publicCourseWhere } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      _count: { select: { courses: { where: publicCourseWhere } } },
    },
    orderBy: { name: "asc" },
    take,
  });
}

export async function activeBanners() {
  const now = new Date();
  return db.banner.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

/** First published lesson the student has not completed (or the first lesson). */
export async function resumeLesson(studentId: string, courseId: string) {
  const lessons = await db.lesson.findMany({
    where: { courseId, isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, progress: { where: { studentId, completedAt: { not: null } }, select: { lessonId: true } } },
  });
  const next = lessons.find((l) => l.progress.length === 0) ?? lessons[0];
  return { lessonId: next?.id ?? null, total: lessons.length, completed: lessons.filter((l) => l.progress.length > 0).length };
}
