import "server-only";
import { db } from "@/lib/db";
import { SYSTEM_ROLES } from "@/lib/permissions";

/** Create/refresh the built-in roles and app version rows. Safe to run repeatedly. */
export async function ensureSystemData() {
  for (const r of SYSTEM_ROLES) {
    const role = await db.role.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug, name: r.name, description: r.description, isSystem: true },
      update: { isSystem: true },
    });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({ data: r.permissions.map((permission) => ({ roleId: role.id, permission })) });
  }
  for (const platform of ["ANDROID", "IOS"] as const) {
    await db.appVersion.upsert({ where: { platform }, create: { platform }, update: {} });
  }
}

export async function hasAdmin() {
  return (await db.user.count({ where: { type: "ADMIN" } })) > 0;
}
