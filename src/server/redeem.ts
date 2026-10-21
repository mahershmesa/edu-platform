import "server-only";
import { db } from "@/lib/db";
import {
  checkRedeem,
  normalizeCodeInput,
  REDEEM_ERRORS,
  REDEEM_MAX_FAILS,
  REDEEM_WINDOW_MIN,
} from "@/lib/domain/codes";

export type RedeemResult =
  | { ok: true; courses: { id: string; title: string }[] }
  | { ok: false; error: string };

class RedeemFail extends Error {}

/**
 * Unlock courses for a student with an access code.
 * One redemption call counts as one use of the code (one student), regardless of how many courses it opens.
 */
export async function redeemCode(studentId: string, rawCode: string, targetCourseId?: string): Promise<RedeemResult> {
  const code = normalizeCodeInput(rawCode);
  const since = new Date(Date.now() - REDEEM_WINDOW_MIN * 60 * 1000);
  const fails = await db.codeAttempt.count({ where: { userId: studentId, success: false, createdAt: { gte: since } } });
  if (fails >= REDEEM_MAX_FAILS) return { ok: false, error: "محاولات كثيرة، حاول بعد قليل." };

  if (!code || code.length < 4 || code.length > 20) {
    await db.codeAttempt.create({ data: { userId: studentId, success: false } });
    return { ok: false, error: REDEEM_ERRORS.NOT_FOUND };
  }

  try {
    const courses = await db.$transaction(async (tx) => {
      const found = await tx.accessCode.findUnique({
        where: { code },
        include: { courses: { include: { course: { select: { id: true, title: true, status: true } } } } },
      });
      const publishedIds = found?.courses.filter((c) => c.course.status === "PUBLISHED").map((c) => c.courseId) ?? [];

      // Revoked enrollments are not silently reactivated.
      if (found) {
        const scope = targetCourseId ? [targetCourseId] : publishedIds;
        const revoked = await tx.enrollment.findFirst({
          where: { studentId, courseId: { in: scope }, status: "REVOKED" },
          include: { course: { select: { title: true } } },
        });
        if (revoked) throw new RedeemFail(`اشتراكك في "${revoked.course.title}" ملغى. تواصل مع الدعم.`);
      }

      const [used, enrolled] = found
        ? await Promise.all([
            tx.codeRedemption.findMany({ where: { codeId: found.id, studentId }, select: { courseId: true } }),
            tx.enrollment.findMany({ where: { studentId, status: "ACTIVE" }, select: { courseId: true } }),
          ])
        : [[], []];

      // A student re-entering a code they already used gets a clear message even if the code is now exhausted.
      const scopeIds = targetCourseId ? [targetCourseId] : publishedIds;
      const usedIds = new Set(used.map((u) => u.courseId));
      if (found && scopeIds.length > 0 && scopeIds.every((id) => usedIds.has(id))) throw new RedeemFail(REDEEM_ERRORS.ALREADY_USED);

      const check = checkRedeem({
        code: found ? { ...found, courseIds: publishedIds } : null,
        usedCourseIdsByStudent: used.map((u) => u.courseId),
        enrolledCourseIds: enrolled.map((e) => e.courseId),
        targetCourseId,
      });
      if (!check.ok) throw new RedeemFail(REDEEM_ERRORS[check.reason]);

      // Atomically consume one use, respecting the limit under concurrency.
      const consumed = await tx.accessCode.updateMany({
        where: {
          id: found!.id,
          isActive: true,
          ...(found!.usageLimit !== null && { usedCount: { lt: found!.usageLimit } }),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (consumed.count === 0) throw new RedeemFail(REDEEM_ERRORS.EXHAUSTED);

      for (const courseId of check.courseIds) {
        await tx.codeRedemption.create({ data: { codeId: found!.id, studentId, courseId } });
        await tx.enrollment.upsert({
          where: { studentId_courseId: { studentId, courseId } },
          create: { studentId, courseId, codeId: found!.id },
          update: {},
        });
      }
      return found!.courses.filter((c) => check.courseIds.includes(c.courseId)).map((c) => ({ id: c.course.id, title: c.course.title }));
    });
    await db.codeAttempt.create({ data: { userId: studentId, success: true } });
    return { ok: true, courses };
  } catch (e) {
    if (e instanceof RedeemFail) {
      await db.codeAttempt.create({ data: { userId: studentId, success: false } });
      return { ok: false, error: e.message };
    }
    throw e;
  }
}
