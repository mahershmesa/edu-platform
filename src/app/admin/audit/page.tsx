import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { PAGE_SIZE, pageFrom, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";

export const metadata: Metadata = { title: "سجل العمليات" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSystemAdmin();
  const params = await searchParams;
  const q = sp(params, "q");
  const page = pageFrom(params);
  const where: Prisma.AuditLogWhereInput = q
    ? {
        OR: [
          { action: { contains: q, mode: "insensitive" } },
          { entity: { contains: q, mode: "insensitive" } },
          { actor: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  const impersonatedIds = [...new Set(logs.map((l) => l.impersonatedId).filter((x): x is string => !!x))];
  const impersonated = impersonatedIds.length
    ? await db.user.findMany({ where: { id: { in: impersonatedIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(impersonated.map((u) => [u.id, u.name]));

  return (
    <>
      <PageHeader title="سجل العمليات" description="كل العمليات الحساسة التي تمت في لوحة التحكم" icon={<ScrollText className="h-6 w-6" />} />
      <SearchBar placeholder="ابحث بالعملية أو اسم المنفذ..." defaultValue={q} />
      <div className="card p-4">
        {logs.length === 0 ? (
          <EmptyState title={q ? "لا توجد نتائج" : "لا توجد عمليات مسجلة بعد"} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المنفذ</th>
                  <th>العملية</th>
                  <th>العنصر</th>
                  <th>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</td>
                    <td>
                      <p className="font-semibold">{l.actor?.name ?? "—"}</p>
                      {l.impersonatedId && (
                        <Badge tone="blue" className="mt-1">
                          بصفة: {names.get(l.impersonatedId) ?? "معلم محذوف"}
                        </Badge>
                      )}
                    </td>
                    <td className="font-mono text-xs" dir="ltr">
                      {l.action}
                    </td>
                    <td className="text-xs text-muted" dir="ltr">
                      {l.entity ? `${l.entity}${l.entityId ? ` · ${l.entityId.slice(-8)}` : ""}` : "—"}
                    </td>
                    <td className="max-w-xs truncate font-mono text-xs text-muted" dir="ltr" title={l.meta ? JSON.stringify(l.meta) : ""}>
                      {l.meta ? JSON.stringify(l.meta) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} params={params} basePath="/admin/audit" />
          </>
        )}
      </div>
    </>
  );
}
