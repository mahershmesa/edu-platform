import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateUniqueCodes } from "@/lib/domain/codes";

export class CodesError extends Error {}

export type CreateCodesInput = {
  teacherId: string;
  courseIds: string[];
  count: number;
  usageLimit: number | null;
  groupName: string | null;
  expiresAt: Date | null;
};

async function assertCoursesOwned(teacherId: string, courseIds: string[]) {
  const unique = [...new Set(courseIds)];
  if (unique.length === 0) throw new CodesError("اختر دورة واحدة على الأقل");
  const owned = await db.course.count({ where: { id: { in: unique }, teacherId } });
  if (owned !== unique.length) throw new CodesError("بعض الدورات المختارة لا تخص هذا المعلم");
  return unique;
}

/** Generate `count` new codes linked to the given courses of one teacher. Returns the plain codes. */
export async function createCodes(input: CreateCodesInput): Promise<string[]> {
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 1000) throw new CodesError("العدد يجب أن يكون بين 1 و1000");
  if (input.usageLimit !== null && (!Number.isInteger(input.usageLimit) || input.usageLimit < 1))
    throw new CodesError("حد الاستخدام يجب أن يكون 1 أو أكثر");
  const courseIds = await assertCoursesOwned(input.teacherId, input.courseIds);

  for (let attempt = 0; attempt < 3; attempt++) {
    const taken = new Set((await db.accessCode.findMany({ select: { code: true } })).map((c) => c.code));
    const codes = generateUniqueCodes(input.count, taken);
    try {
      await db.$transaction(
        codes.map((code) =>
          db.accessCode.create({
            data: {
              code,
              teacherId: input.teacherId,
              groupName: input.groupName,
              usageLimit: input.usageLimit,
              expiresAt: input.expiresAt,
              courses: { create: courseIds.map((courseId) => ({ courseId })) },
            },
          }),
        ),
      );
      return codes;
    } catch (e) {
      // Race on a unique code: regenerate.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new CodesError("تعذر توليد أكواد فريدة، حاول مرة أخرى");
}

export async function updateCode(
  codeId: string,
  teacherId: string,
  data: { groupName: string | null; usageLimit: number | null; expiresAt: Date | null; courseIds: string[] },
) {
  const code = await db.accessCode.findFirst({ where: { id: codeId, teacherId } });
  if (!code) throw new CodesError("الكود غير موجود");
  if (data.usageLimit !== null && data.usageLimit < Math.max(1, code.usedCount))
    throw new CodesError(`حد الاستخدام لا يمكن أن يقل عن عدد الاستخدامات الحالي (${code.usedCount})`);
  const courseIds = await assertCoursesOwned(teacherId, data.courseIds);
  await db.$transaction([
    db.accessCodeCourse.deleteMany({ where: { codeId } }),
    db.accessCode.update({
      where: { id: codeId },
      data: {
        groupName: data.groupName,
        usageLimit: data.usageLimit,
        expiresAt: data.expiresAt,
        courses: { create: courseIds.map((courseId) => ({ courseId })) },
      },
    }),
  ]);
}

export async function toggleCode(codeId: string, teacherId: string) {
  const code = await db.accessCode.findFirst({ where: { id: codeId, teacherId } });
  if (!code) throw new CodesError("الكود غير موجود");
  await db.accessCode.update({ where: { id: codeId }, data: { isActive: !code.isActive } });
  return !code.isActive;
}

export async function deleteCode(codeId: string, teacherId: string) {
  const code = await db.accessCode.findFirst({ where: { id: codeId, teacherId } });
  if (!code) throw new CodesError("الكود غير موجود");
  if (code.usedCount > 0) throw new CodesError("لا يمكن حذف كود مستخدم، يمكنك تعطيله بدلاً من ذلك");
  await db.accessCode.delete({ where: { id: codeId } });
}

/** Codes of a teacher with filters, ordered by group then newest. */
export async function listCodes(teacherId: string, opts: { courseId?: string; q?: string; group?: string | null }) {
  return db.accessCode.findMany({
    where: {
      teacherId,
      ...(opts.courseId && { courses: { some: { courseId: opts.courseId } } }),
      ...(opts.q && { code: { contains: opts.q.toUpperCase().replace(/[\s-]/g, "") } }),
      ...(opts.group !== undefined && { groupName: opts.group }),
    },
    orderBy: [{ groupName: "asc" }, { createdAt: "desc" }],
    include: { courses: { include: { course: { select: { id: true, title: true } } } } },
    take: 5000,
  });
}

export async function codeStats(teacherId: string) {
  const [total, courses, groups] = await Promise.all([
    db.accessCode.count({ where: { teacherId } }),
    db.course.count({ where: { teacherId } }),
    db.accessCode.findMany({ where: { teacherId, groupName: { not: null } }, distinct: ["groupName"], select: { groupName: true } }),
  ]);
  return { total, courses, groups: groups.length };
}
