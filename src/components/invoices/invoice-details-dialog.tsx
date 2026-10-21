"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function InvoiceDetailsDialog({
  title,
  rows,
  instructions,
}: {
  title: string;
  rows: { label: string; value: string }[];
  instructions?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5" /> عرض التفاصيل
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} size="sm">
        <dl className="divide-y divide-line text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">{r.label}</dt>
              <dd className="text-left font-semibold">{r.value}</dd>
            </div>
          ))}
        </dl>
        {instructions && <p className="mt-4 rounded-xl bg-surface p-3 text-sm leading-6 text-muted">{instructions}</p>}
      </Dialog>
    </>
  );
}
