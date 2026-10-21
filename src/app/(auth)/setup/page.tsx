import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextField } from "@/components/ui/field";
import { hasAdmin } from "@/server/bootstrap";
import { setupAction } from "./actions";

export const metadata: Metadata = { title: "إعداد المنصة" };
export const dynamic = "force-dynamic";

/** First-run page: only available while no system admin exists. */
export default async function SetupPage() {
  if (await hasAdmin()) redirect("/login");
  return (
    <>
      <h1 className="text-3xl font-extrabold">إعداد المنصة</h1>
      <p className="mt-2 text-sm text-muted">أنشئ حساب مدير النظام الأول. تظهر هذه الصفحة مرة واحدة فقط.</p>
      <ActionForm action={setupAction} className="mt-8 space-y-4" showSuccessToast={false}>
        <TextField name="name" label="الاسم" required />
        <TextField name="email" type="email" label="البريد الإلكتروني" required dir="ltr" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="password" type="password" label="كلمة المرور" required autoComplete="new-password" />
          <TextField name="confirm" type="password" label="تأكيد كلمة المرور" required autoComplete="new-password" />
        </div>
        <SubmitButton className="h-12 w-full">إنشاء حساب المدير</SubmitButton>
      </ActionForm>
    </>
  );
}
