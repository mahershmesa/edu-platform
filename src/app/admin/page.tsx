import { requireAdminArea } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminHome() {
  await requireAdminArea();
  return <PageHeader title="لوحة التحكم" description="نظرة عامة على المنصة" />;
}
