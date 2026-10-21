import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format";

/** Keeps existing query params and swaps `page`. */
export function Pagination({
  page,
  total,
  pageSize,
  params,
  basePath,
}: {
  page: number;
  total: number;
  pageSize: number;
  params: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v === undefined) continue;
      q.set(k, Array.isArray(v) ? v[0] : v);
    }
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-muted">
      <span>
        صفحة {formatNumber(page)} من {formatNumber(pages)} · {formatNumber(total)} عنصر
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 hover:bg-surface">
            <ChevronRight className="h-4 w-4" /> السابق
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 hover:bg-surface">
            التالي <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
