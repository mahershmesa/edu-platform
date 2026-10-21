import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { codeState } from "@/lib/domain/codes";
import { getSettings } from "@/lib/settings";
import { listCodes } from "@/server/codes";
import { resolveCodesReader } from "@/server/codes-access";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "طباعة الأكواد", robots: { index: false } };

const NO_GROUP = "__none__";

/** Printable sheet of code cards (A4). Only active codes are printed. */
export default async function PrintCodesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const params = await searchParams;
  const teacherId = await resolveCodesReader(params.teacherId ?? null);
  if (!teacherId) notFound();
  const groupParam = params.group;
  const group = groupParam === undefined ? undefined : groupParam === NO_GROUP ? null : groupParam;

  const [teacher, codes, settings] = await Promise.all([
    db.user.findUnique({ where: { id: teacherId }, select: { name: true } }),
    listCodes(teacherId, { group }),
    getSettings(),
  ]);
  const now = new Date();
  const printable = codes.filter((c) => codeState(c, now) === "ACTIVE");

  return (
    <div className="mx-auto max-w-5xl p-6 print:p-0">
      <style>{`@media print { @page { size: A4; margin: 10mm; } body { background: #fff; } }`}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">طباعة الأكواد</h1>
          <p className="text-sm text-muted">
            {teacher?.name} · {group === undefined ? "كل المجموعات" : group === null ? "بدون مجموعة" : group} · {printable.length} كود صالح
          </p>
        </div>
        <PrintButton />
      </div>
      {printable.length === 0 ? (
        <p className="rounded-xl bg-surface p-6 text-center text-muted">لا توجد أكواد صالحة للطباعة.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
          {printable.map((c) => (
            <div key={c.id} className="break-inside-avoid rounded-xl border-2 border-dashed border-brand-300 p-3 text-center">
              <p className="text-xs font-bold text-brand-700">{settings.platformName}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted">{teacher?.name}</p>
              <p className="my-2 font-mono text-xl font-extrabold tracking-[0.2em]" dir="ltr">
                {c.code}
              </p>
              <p className="line-clamp-2 text-[10px] leading-4 text-muted">{c.courses.map((x) => x.course.title).join("، ")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
