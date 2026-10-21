import { db } from "@/lib/db";
import { codeState, CODE_STATE_LABELS } from "@/lib/domain/codes";
import { formatShortDate } from "@/lib/format";
import { listCodes } from "@/server/codes";
import { resolveCodesReader } from "@/server/codes-access";

const NO_GROUP = "__none__";

function csvCell(v: string): string {
  // Neutralize spreadsheet formulas and quote.
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teacherId = await resolveCodesReader(url.searchParams.get("teacherId"));
  if (!teacherId) return new Response("Forbidden", { status: 403 });
  const groupParam = url.searchParams.get("group");
  const group = groupParam === null ? undefined : groupParam === NO_GROUP ? null : groupParam;

  const teacher = await db.user.findUnique({ where: { id: teacherId }, select: { name: true } });
  const codes = await listCodes(teacherId, { group });
  const now = new Date();
  const rows = [
    ["الكود", "المجموعة", "الدورات", "الاستخدام", "الحد", "الحالة", "ينتهي", "تاريخ الإنشاء"],
    ...codes.map((c) => [
      c.code,
      c.groupName ?? "",
      c.courses.map((x) => x.course.title).join(" | "),
      String(c.usedCount),
      c.usageLimit === null ? "بلا حد" : String(c.usageLimit),
      CODE_STATE_LABELS[codeState(c, now)],
      c.expiresAt ? formatShortDate(c.expiresAt) : "",
      formatShortDate(c.createdAt),
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const name = `codes-${(teacher?.name ?? "teacher").replace(/[^\p{L}\p{N}]+/gu, "-")}${group ? `-${group}` : ""}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="codes.csv"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
