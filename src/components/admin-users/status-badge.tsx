import { Badge } from "@/components/ui/badge";

export function UserStatusBadge({ status }: { status: "ACTIVE" | "SUSPENDED" }) {
  return status === "ACTIVE" ? <Badge tone="green">نشط</Badge> : <Badge tone="amber">موقوف</Badge>;
}
