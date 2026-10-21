import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { CurrentUser } from "./auth";

/** Record an action. In impersonation mode the actor is the admin, not the teacher. */
export async function audit(
  user: CurrentUser,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Prisma.InputJsonValue,
) {
  await db.auditLog.create({
    data: {
      actorId: user.impersonator?.id ?? user.id,
      impersonatedId: user.impersonator ? user.id : null,
      action,
      entity,
      entityId,
      meta,
    },
  });
}
