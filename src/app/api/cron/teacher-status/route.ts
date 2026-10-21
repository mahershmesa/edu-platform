import { timingSafeEqual } from "node:crypto";
import { syncTeacherStatus } from "@/server/teacher-status";

export const dynamic = "force-dynamic";

/** Daily job: curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/teacher-status */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncTeacherStatus();
  return Response.json({ ok: true, ...result, at: new Date().toISOString() });
}
