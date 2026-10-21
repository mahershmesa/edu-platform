import "server-only";
import { can, getCurrentUser } from "@/lib/auth";

/** Who may read a teacher's codes: admin/staff with codes.read, or the teacher. Returns the teacherId or null. */
export async function resolveCodesReader(requestedTeacherId: string | null): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.type === "TEACHER") return requestedTeacherId && requestedTeacherId !== user.id ? null : user.id;
  if (!requestedTeacherId || !can(user, "codes.read")) return null;
  return requestedTeacherId;
}
