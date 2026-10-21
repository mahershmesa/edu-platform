"use client";

import { useState } from "react";
import { ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { RedemptionRow } from "./actions";

export function RedemptionsDialog({
  code,
  load,
}: {
  code: string;
  load: () => Promise<RedemptionRow[] | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RedemptionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const show = async () => {
    setOpen(true);
    setRows(null);
    setError(null);
    const r = await load();
    if ("error" in r) setError(r.error);
    else setRows(r);
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={show} aria-label="عرض من استخدم الكود" title="عرض من استخدم الكود">
        <ListChecks className="h-4 w-4" />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`استخدامات الكود ${code}`}>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && rows === null && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل...
          </p>
        )}
        {rows && rows.length === 0 && <p className="py-6 text-center text-sm text-muted">لم يُستخدم هذا الكود بعد.</p>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="table-base">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>التواصل</th>
                  <th>الدورة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.student}</td>
                    <td dir="ltr" className="text-right">
                      {r.contact}
                    </td>
                    <td>{r.course}</td>
                    <td>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>
    </>
  );
}
