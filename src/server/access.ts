import "server-only";
import { db } from "@/lib/db";

/** Is the student actively enrolled in the course? */
export async function isEnrolled(studentId: string, courseId: string): Promise<boolean> {
  const e = await db.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } });
  return e?.status === "ACTIVE";
}

/**
 * Can this viewer watch the lesson?
 * Free published lessons of a published course are open to everyone (even guests);
 * other lessons need an active enrollment. Teachers see their own; admins see all.
 */
export async function canWatchLesson(
  viewer: { id: string; type: string } | null,
  lesson: { isFree: boolean; isPublished: boolean; courseId: string; course: { teacherId: string; status: string } },
): Promise<boolean> {
  if (viewer && (viewer.type === "ADMIN" || viewer.type === "STAFF")) return true;
  if (viewer?.type === "TEACHER" && lesson.course.teacherId === viewer.id) return true;
  if (!lesson.isPublished || lesson.course.status !== "PUBLISHED") return false;
  if (lesson.isFree) return true;
  if (!viewer || viewer.type !== "STUDENT") return false;
  return isEnrolled(viewer.id, lesson.courseId);
}
