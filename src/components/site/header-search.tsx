"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/courses?q=${encodeURIComponent(v)}` : "/courses");
    setOpen(false);
  };
  return (
    <>
      <form onSubmit={submit} className="relative hidden md:block" role="search">
        <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن دورة..."
          aria-label="ابحث عن دورة"
          className="input h-10 w-56 py-0 pr-9 lg:w-64"
        />
      </form>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-surface md:hidden"
        aria-label="بحث"
      >
        <Search className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-line bg-white p-3 shadow-lg md:hidden">
          <form onSubmit={submit} className="flex items-center gap-2" role="search">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن دورة أو مادة..." className="input h-11" />
            <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-surface" aria-label="إغلاق">
              <X className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
