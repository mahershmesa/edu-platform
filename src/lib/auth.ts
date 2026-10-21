import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { User, UserType } from "@prisma/client";
import { db } from "./db";
import type { Permission } from "./permissions";
import { getSettings } from "./settings";

const SESSION_COOKIE = "asaas_session";
const PREV_SESSION_COOKIE = "asaas_prev_session"; // جلسة المدير أثناء الدخول بصفة معلم
const DEVICE_COOKIE = "asaas_device";
const SESSION_DAYS = 30;

export type CurrentUser = User & {
  permissions: Set<string>;
  /** المدير الذي يتصفح بصفة هذا المعلم (إن وُجد) */
  impersonator: Pick<User, "id" | "name"> | null;
  sessionId: string;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function cookieOptions(days: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  };
}

/** Long-lived random id identifying this browser, used for the device limit. */
async function getOrCreateDeviceFingerprint(): Promise<string> {
  const jar = await cookies();
  let fp = jar.get(DEVICE_COOKIE)?.value;
  if (!fp || !/^[\w-]{20,64}$/.test(fp)) {
    fp = randomBytes(18).toString("base64url");
    jar.set(DEVICE_COOKIE, fp, cookieOptions(3650));
  }
  return fp;
}

export function describeUserAgent(ua: string): string {
  const os = /Android/i.test(ua)
    ? "أندرويد"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "آيفون/آيباد"
      : /Windows/i.test(ua)
        ? "ويندوز"
        : /Mac OS/i.test(ua)
          ? "ماك"
          : /Linux/i.test(ua)
            ? "لينكس"
            : "جهاز غير معروف";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "متصفح";
  return `${browser} على ${os}`;
}

export class DeviceLimitError extends Error {}

/**
 * Create a session for the user. Students are limited to `maxDevices` devices;
 * a new device beyond the limit throws DeviceLimitError.
 */
export async function createSession(user: Pick<User, "id" | "type">, impersonatorId?: string) {
  const fingerprint = await getOrCreateDeviceFingerprint();
  const ua = (await headers()).get("user-agent") ?? "";

  let deviceId: string | null = null;
  if (!impersonatorId) {
    const existing = await db.device.findUnique({ where: { userId_fingerprint: { userId: user.id, fingerprint } } });
    if (existing) {
      deviceId = existing.id;
      await db.device.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
    } else {
      if (user.type === "STUDENT") {
        const { maxDevices } = await getSettings();
        const count = await db.device.count({ where: { userId: user.id } });
        if (count >= maxDevices) throw new DeviceLimitError();
      }
      const device = await db.device.create({
        data: { userId: user.id, fingerprint, label: describeUserAgent(ua) },
      });
      deviceId = device.id;
    }
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { tokenHash: hashToken(token), userId: user.id, deviceId, impersonatorId, expiresAt },
  });
  if (!impersonatorId) await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
  const prev = jar.get(PREV_SESSION_COOKIE)?.value;
  if (prev) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(prev) } });
    jar.delete(PREV_SESSION_COOKIE);
  }
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { include: { role: { include: { permissions: true } } } },
      impersonator: { select: { id: true, name: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  // A removed device logs out its sessions (cascade), but double-check suspension.
  const { user } = session;
  if (user.status === "SUSPENDED" && user.type !== "TEACHER") return null;
  const permissions = new Set<string>(
    user.type === "STAFF" && user.role?.isActive ? user.role.permissions.map((p) => p.permission) : [],
  );
  return { ...user, permissions, impersonator: session.impersonator, sessionId: session.id };
});

export function can(user: Pick<CurrentUser, "type" | "permissions"> | null, perm: Permission): boolean {
  if (!user) return false;
  if (user.type === "ADMIN") return true;
  if (user.type === "STAFF") return user.permissions.has(perm);
  return false;
}

export function isAdminArea(type: UserType) {
  return type === "ADMIN" || type === "STAFF";
}

export function homeFor(type: UserType): string {
  if (type === "ADMIN" || type === "STAFF") return "/admin";
  if (type === "TEACHER") return "/teacher";
  return "/my-courses";
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For admin pages/actions: requires ADMIN or STAFF with the permission. */
export async function requirePermission(perm: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, perm)) redirect(isAdminArea(user.type) ? "/admin?denied=1" : homeFor(user.type));
  return user;
}

export async function requireSystemAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.type !== "ADMIN") redirect(isAdminArea(user.type) ? "/admin?denied=1" : homeFor(user.type));
  return user;
}

export async function requireAdminArea(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isAdminArea(user.type)) redirect(homeFor(user.type));
  return user;
}

export async function requireTeacher(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.type !== "TEACHER") redirect(homeFor(user.type));
  return user;
}

export async function requireStudent(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.type !== "STUDENT") redirect(homeFor(user.type));
  return user;
}

/** A teacher can change content only when not suspended (manual or billing). */
export function teacherCanEdit(user: Pick<User, "type" | "status" | "manualSuspended" | "billingSuspended">): boolean {
  return user.type === "TEACHER" && user.status === "ACTIVE" && !user.manualSuspended && !user.billingSuspended;
}

/** Start browsing as a teacher. The admin's own session is kept to return to later. */
export async function startImpersonation(admin: CurrentUser, teacherId: string) {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  if (!current) return;
  const teacher = await db.user.findFirst({ where: { id: teacherId, type: "TEACHER" } });
  if (!teacher) throw new Error("المعلم غير موجود");
  // Already impersonating: drop the old impersonation session and keep the original admin one.
  if (admin.impersonator) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(current) } });
  } else {
    jar.set(PREV_SESSION_COOKIE, current, cookieOptions(1));
  }
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: teacher.id,
      impersonatorId: admin.impersonator?.id ?? admin.id,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });
  jar.set(SESSION_COOKIE, token, cookieOptions(1));
}

export async function stopImpersonation() {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  const prev = jar.get(PREV_SESSION_COOKIE)?.value;
  if (current) await db.session.deleteMany({ where: { tokenHash: hashToken(current), impersonatorId: { not: null } } });
  if (prev) {
    jar.set(SESSION_COOKIE, prev, cookieOptions(SESSION_DAYS));
    jar.delete(PREV_SESSION_COOKIE);
  } else {
    jar.delete(SESSION_COOKIE);
  }
}
