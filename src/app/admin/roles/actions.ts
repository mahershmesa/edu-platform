"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { done, fail, type ActionState } from "@/lib/action";
import { bool, optStr, str } from "@/lib/utils";
import { isPermission } from "@/lib/permissions";
import { slugify } from "@/server/admin-users";

function readPermissions(form: FormData): string[] {
  return [...new Set(form.getAll("permissions").map(String).filter(isPermission))];
}

async function readSlug(form: FormData, name: string, excludeId?: string) {
  const raw = str(form, "slug");
  let slug = slugify(raw || name);
  if (!slug) slug = `role-${randomBytes(3).toString("hex")}`;
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return { error: "المعرّف يجب أن يكون أحرفاً لاتينية وأرقاماً وشرطات" };
  const exists = await db.role.findFirst({ where: { slug, ...(excludeId && { id: { not: excludeId } }) } });
  if (exists) return { error: "هذا المعرّف مستخدم مسبقاً" };
  return { slug };
}

export async function createRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireSystemAdmin();
  const name = str(form, "name");
  if (name.length < 2 || name.length > 60) return fail("يرجى تصحيح الحقول المظللة", { name: "اسم الدور مطلوب" });
  const s = await readSlug(form, name);
  if ("error" in s) return fail("يرجى تصحيح الحقول المظللة", { slug: s.error! });
  const permissions = readPermissions(form);
  if (permissions.length === 0) return fail("اختر صلاحية واحدة على الأقل");
  const role = await db.role.create({
    data: {
      name,
      slug: s.slug,
      description: optStr(form, "description"),
      isActive: bool(form, "isActive"),
      permissions: { create: permissions.map((permission) => ({ permission })) },
    },
  });
  await audit(user, "role.create", "Role", role.id, { name, permissions });
  revalidatePath("/admin/roles");
  return done("تم إنشاء الدور");
}

export async function updateRole(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireSystemAdmin();
  const role = await db.role.findUnique({ where: { id } });
  if (!role) return fail("الدور غير موجود");

  // System roles: only the active flag can change.
  if (role.isSystem) {
    await db.role.update({ where: { id }, data: { isActive: bool(form, "isActive") } });
    await audit(user, "role.update", "Role", id, { isActive: bool(form, "isActive") });
    revalidatePath("/admin/roles");
    return done("تم حفظ حالة الدور");
  }

  const name = str(form, "name");
  if (name.length < 2 || name.length > 60) return fail("يرجى تصحيح الحقول المظللة", { name: "اسم الدور مطلوب" });
  const s = await readSlug(form, name, id);
  if ("error" in s) return fail("يرجى تصحيح الحقول المظللة", { slug: s.error! });
  const permissions = readPermissions(form);
  if (permissions.length === 0) return fail("اختر صلاحية واحدة على الأقل");
  await db.$transaction([
    db.role.update({
      where: { id },
      data: { name, slug: s.slug, description: optStr(form, "description"), isActive: bool(form, "isActive") },
    }),
    db.rolePermission.deleteMany({ where: { roleId: id } }),
    db.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: id, permission })) }),
  ]);
  await audit(user, "role.update", "Role", id, { permissions });
  revalidatePath("/admin/roles");
  return done("تم حفظ الدور");
}

export async function deleteRole(id: string): Promise<ActionState> {
  const user = await requireSystemAdmin();
  const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) return fail("الدور غير موجود");
  if (role.isSystem) return fail("لا يمكن حذف دور نظامي");
  if (role._count.users > 0) return fail(`لا يمكن الحذف: الدور مسند إلى ${role._count.users} موظف.`);
  await db.role.delete({ where: { id } });
  await audit(user, "role.delete", "Role", id, { name: role.name });
  revalidatePath("/admin/roles");
  return done("تم حذف الدور");
}
