import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";

export default async function TeacherHome() {
  await requireTeacher();
  return <PageHeader title="لوحة التحكم" description="نظرة عامة على دوراتك وطلابك" />;
}
