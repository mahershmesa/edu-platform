"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { can, requireUser, teacherCanEdit, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, zodFail, type ActionState } from "@/lib/action";
import { int, optStr } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { CodesError, createCodes, deleteCode, toggleCode, updateCode } from "@/server/codes";

type CodePerm = "codes.read" | "codes.write" | "codes.delete";

/** Admin/staff with the permission, or the owning teacher (who must not be suspended for writes). */
async function authorize(teacherId: string, perm: CodePerm): Promise<{ user: CurrentUser } | { error: string }> {
  const user = await requireUser();
  if (user.type === "TEACHER") {
    if (user.id !== teacherId) return { error: "غير مسموح" };
    if (perm !== "codes.read" && !teacherCanEdit(user)) return { error: "حسابك موقوف حالياً، لا يمكنك تعديل الأكواد" };
    return { user };
  }
  if (!can(user, perm)) return { error: "ليست لديك صلاحية لهذا الإجراء" };
  const teacher = await db.user.findFirst({ where: { id: teacherId, type: "TEACHER" }, select: { id: true } });
  if (!teacher) return { error: "المعلم غير موجود" };
  return { user };
}

function refresh() {
  revalidatePath("/admin/codes");
  revalidatePath("/teacher/codes");
}

/** yyyy-mm-dd → end of that day in Baghdad time. */
function parseExpiry(v: string | null): Date | null | "invalid" {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "invalid";
  const d = new Date(`${v}T23:59:59+03:00`);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

const createSchema = z.object({
  courseIds: z.array(z.string().min(1)).min(1, "اختر دورة واحدة على الأقل"),
  count: z.number({ message: "أدخل العدد" }).int().min(1, "العدد 1 على الأقل").max(1000, "الحد الأقصى 1000 كود في المرة"),
  usageLimit: z.number().int().min(1, "حد الاستخدام 1 على الأقل").max(100000).nullable(),
  groupName: z.string().trim().max(60, "اسم المجموعة طويل").nullable(),
});

export async function createCodesAction(teacherId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const auth = await authorize(teacherId, "codes.write");
  if ("error" in auth) return fail(auth.error);
  const parsed = createSchema.safeParse({
    courseIds: form.getAll("courseIds").map(String),
    count: int(form, "count") ?? undefined,
    usageLimit: int(form, "usageLimit"),
    groupName: optStr(form, "groupName"),
  });
  if (!parsed.success) return zodFail(parsed.error.issues);
  const expiresAt = parseExpiry(optStr(form, "expiresAt"));
  if (expiresAt === "invalid") return fail("تحقق من الحقول", { expiresAt: "تاريخ غير صالح" });
  if (expiresAt && expiresAt < new Date()) return fail("تحقق من الحقول", { expiresAt: "تاريخ الانتهاء يجب أن يكون في المستقبل" });
  try {
    const codes = await createCodes({ teacherId, ...parsed.data, expiresAt });
    await audit(auth.user, "codes.create", "AccessCode", undefined, {
      teacherId,
      count: codes.length,
      groupName: parsed.data.groupName,
    });
    refresh();
    return done(`تم إنشاء ${codes.length} كود`, { codes });
  } catch (e) {
    if (e instanceof CodesError) return fail(e.message);
    throw e;
  }
}

export async function updateCodeAction(teacherId: string, codeId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const auth = await authorize(teacherId, "codes.write");
  if ("error" in auth) return fail(auth.error);
  const courseIds = form.getAll("courseIds").map(String).filter(Boolean);
  if (courseIds.length === 0) return fail("تحقق من الحقول", { courseIds: "اختر دورة واحدة على الأقل" });
  const usageLimit = int(form, "usageLimit");
  if (usageLimit !== null && usageLimit < 1) return fail("تحقق من الحقول", { usageLimit: "حد الاستخدام 1 على الأقل" });
  const groupName = optStr(form, "groupName");
  if (groupName && groupName.length > 60) return fail("تحقق من الحقول", { groupName: "اسم المجموعة طويل" });
  const expiresAt = parseExpiry(optStr(form, "expiresAt"));
  if (expiresAt === "invalid") return fail("تحقق من الحقول", { expiresAt: "تاريخ غير صالح" });
  try {
    await updateCode(codeId, teacherId, { groupName, usageLimit, expiresAt, courseIds });
    await audit(auth.user, "codes.update", "AccessCode", codeId);
    refresh();
    return done("تم حفظ الكود");
  } catch (e) {
    if (e instanceof CodesError) return fail(e.message);
    throw e;
  }
}

export async function toggleCodeAction(teacherId: string, codeId: string): Promise<ActionState> {
  const auth = await authorize(teacherId, "codes.delete");
  if ("error" in auth) return fail(auth.error);
  try {
    const active = await toggleCode(codeId, teacherId);
    await audit(auth.user, active ? "codes.enable" : "codes.disable", "AccessCode", codeId);
    refresh();
    return done(active ? "تم تفعيل الكود" : "تم تعطيل الكود");
  } catch (e) {
    if (e instanceof CodesError) return fail(e.message);
    throw e;
  }
}

export async function deleteCodeAction(teacherId: string, codeId: string): Promise<ActionState> {
  const auth = await authorize(teacherId, "codes.delete");
  if ("error" in auth) return fail(auth.error);
  try {
    await deleteCode(codeId, teacherId);
    await audit(auth.user, "codes.delete", "AccessCode", codeId);
    refresh();
    return done("تم حذف الكود");
  } catch (e) {
    if (e instanceof CodesError) return fail(e.message);
    throw e;
  }
}

export type RedemptionRow = { id: string; student: string; contact: string; course: string; date: string };

export async function getRedemptionsAction(teacherId: string, codeId: string): Promise<RedemptionRow[] | { error: string }> {
  const auth = await authorize(teacherId, "codes.read");
  if ("error" in auth) return { error: auth.error };
  const rows = await db.codeRedemption.findMany({
    where: { codeId, code: { teacherId } },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true, phone: true, email: true } },
      course: { select: { title: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    student: r.student.name,
    contact: r.student.phone ? displayPhone(r.student.phone) : (r.student.email ?? "—"),
    course: r.course.title,
    date: formatShortDate(r.createdAt),
  }));
}

