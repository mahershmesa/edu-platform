import { BookOpen, Download, Hash, Pencil, Power, Printer, Trash2, Users } from "lucide-react";
import { db } from "@/lib/db";
import { codeState, CODE_STATE_LABELS, type CodeState } from "@/lib/domain/codes";
import { formatNumber, formatShortDate, toDateInput } from "@/lib/format";
import { codeStats, listCodes } from "@/server/codes";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { StatCard } from "@/components/ui/stat-card";
import { TextField } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { CourseChecklist } from "./course-checklist";
import { CreateCodesDialog } from "./create-codes-dialog";
import { RedemptionsDialog } from "./redemptions-dialog";
import { createCodesAction, deleteCodeAction, getRedemptionsAction, toggleCodeAction, updateCodeAction } from "./actions";

const STATE_TONES: Record<CodeState, BadgeTone> = { ACTIVE: "green", DISABLED: "gray", EXHAUSTED: "amber", EXPIRED: "red" };

/** Encodes the "no group" bucket in URLs. */
export const NO_GROUP = "__none__";

/**
 * Full codes management UI for one teacher. Used by /admin/codes and /teacher/codes.
 * `hiddenParams` are kept in the filter form (e.g. teacherId on the admin page).
 */
export async function CodesManager({
  teacherId,
  courseId,
  q,
  canWrite,
  canDelete,
  hiddenParams = {},
}: {
  teacherId: string;
  courseId: string;
  q: string;
  canWrite: boolean;
  canDelete: boolean;
  hiddenParams?: Record<string, string>;
}) {
  const [courses, stats, codes] = await Promise.all([
    db.course.findMany({ where: { teacherId }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }),
    codeStats(teacherId),
    listCodes(teacherId, { courseId: courseId || undefined, q: q || undefined }),
  ]);

  const groups = new Map<string, typeof codes>();
  for (const c of codes) {
    const key = c.groupName ?? NO_GROUP;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const groupEntries = [...groups.entries()].sort(([a], [b]) => (a === NO_GROUP ? -1 : b === NO_GROUP ? 1 : a.localeCompare(b, "ar")));

  const qs = (extra: Record<string, string>) => new URLSearchParams({ teacherId, ...extra }).toString();
  const printBase = `/print/codes?${qs({})}`;
  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي الأكواد" value={formatNumber(stats.total)} icon={<Hash className="h-6 w-6" />} />
        <StatCard label="دورات المعلم" value={formatNumber(stats.courses)} icon={<BookOpen className="h-6 w-6" />} tone="teal" />
        <StatCard label="المجموعات" value={formatNumber(stats.groups)} icon={<Users className="h-6 w-6" />} tone="blue" />
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <form className="flex flex-1 flex-wrap items-end gap-3" role="search">
            {Object.entries(hiddenParams).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <div className="min-w-[180px]">
              <label htmlFor="courseId" className="label">
                تصفية حسب الدورة
              </label>
              <select id="courseId" name="courseId" defaultValue={courseId} className="input">
                <option value="">كل الدورات</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label htmlFor="q" className="label">
                بحث بالكود
              </label>
              <input id="q" name="q" defaultValue={q} placeholder="مثال: AB3K7Q" className="input" dir="ltr" />
            </div>
            <button type="submit" className={buttonClass("secondary")}>
              تطبيق
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/codes/export?${qs({})}`} className={buttonClass("secondary")}>
              <Download className="h-4 w-4" /> تصدير Excel
            </a>
            {canWrite && <CreateCodesDialog action={createCodesAction.bind(null, teacherId)} courses={courses} printHref={printBase} />}
          </div>
        </div>
      </div>

      {groupEntries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Hash className="h-7 w-7" />}
            title={q || courseId ? "لا توجد أكواد مطابقة" : "لا توجد أكواد بعد"}
            description={q || courseId ? "غيّر التصفية أو كلمة البحث" : "أنشئ أكواداً وبِعها للطلاب لفتح الدورات"}
            action={
              canWrite && !q && !courseId ? (
                <CreateCodesDialog action={createCodesAction.bind(null, teacherId)} courses={courses} printHref={printBase} />
              ) : undefined
            }
          />
        </div>
      ) : (
        groupEntries.map(([group, items]) => {
          const used = items.filter((c) => c.usedCount > 0).length;
          return (
            <section key={group} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">{group === NO_GROUP ? "بدون مجموعة" : group}</h2>
                  <Badge>{formatNumber(items.length)} كود</Badge>
                  <span className="text-xs text-muted">مستخدم: {formatNumber(used)}</span>
                </div>
                <div className="flex gap-1">
                  <a href={`/api/codes/export?${qs({ group })}`} className={buttonClass("ghost", "sm")}>
                    <Download className="h-3.5 w-3.5" /> CSV
                  </a>
                  <a href={`${printBase}&group=${encodeURIComponent(group)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
                    <Printer className="h-3.5 w-3.5" /> طباعة
                  </a>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>الكود</th>
                      <th>الدورات</th>
                      <th>الاستخدام</th>
                      <th>الحالة</th>
                      <th>تاريخ الإنشاء</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => {
                      const state = codeState(c, now);
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="flex items-center gap-1" dir="ltr">
                              <code className="font-mono text-sm font-bold tracking-wider">{c.code}</code>
                              <CopyButton text={c.code} />
                            </div>
                          </td>
                          <td>
                            <div className="flex max-w-md flex-wrap gap-1">
                              {c.courses.map((cc) => (
                                <Badge key={cc.courseId} tone="blue">
                                  {cc.course.title}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="tabular-nums whitespace-nowrap" dir="ltr">
                            {formatNumber(c.usedCount)} / {c.usageLimit === null ? "∞" : formatNumber(c.usageLimit)}
                          </td>
                          <td>
                            <Badge tone={STATE_TONES[state]}>{CODE_STATE_LABELS[state]}</Badge>
                            {c.expiresAt && state !== "EXPIRED" && <p className="mt-1 text-[11px] text-muted">ينتهي {formatShortDate(c.expiresAt)}</p>}
                          </td>
                          <td className="whitespace-nowrap text-muted">{formatShortDate(c.createdAt)}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              {canWrite && (
                                <FormDialog
                                  title={`تعديل الكود ${c.code}`}
                                  action={updateCodeAction.bind(null, teacherId, c.id)}
                                  trigger={
                                    <Button variant="ghost" size="icon" aria-label="تعديل" title="تعديل">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  }
                                >
                                  <CourseChecklist courses={courses} defaultSelected={c.courses.map((x) => x.courseId)} />
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <TextField
                                      name="usageLimit"
                                      label="حد الاستخدام"
                                      type="number"
                                      min={Math.max(1, c.usedCount)}
                                      defaultValue={c.usageLimit ?? ""}
                                      placeholder="فارغ = بلا حد"
                                      hint={`مستخدم حالياً ${c.usedCount} مرة`}
                                    />
                                    <TextField name="expiresAt" label="تاريخ الانتهاء" type="date" defaultValue={toDateInput(c.expiresAt)} />
                                  </div>
                                  <TextField name="groupName" label="اسم المجموعة" defaultValue={c.groupName ?? ""} />
                                </FormDialog>
                              )}
                              <RedemptionsDialog code={c.code} load={getRedemptionsAction.bind(null, teacherId, c.id)} />
                              {canDelete && (
                                <ActionButton action={toggleCodeAction.bind(null, teacherId, c.id)} variant="ghost" size="icon">
                                  <Power className={c.isActive ? "h-4 w-4 text-amber-600" : "h-4 w-4 text-brand-600"} aria-label={c.isActive ? "تعطيل" : "تفعيل"} />
                                </ActionButton>
                              )}
                              {canDelete && c.usedCount === 0 && (
                                <ConfirmAction
                                  title="حذف الكود"
                                  message={`حذف الكود ${c.code} نهائياً؟`}
                                  action={deleteCodeAction.bind(null, teacherId, c.id)}
                                  confirmLabel="حذف"
                                  trigger={
                                    <Button variant="ghost" size="icon" aria-label="حذف" title="حذف" className="text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
