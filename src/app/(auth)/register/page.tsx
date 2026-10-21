import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { SelectField, TextField } from "@/components/ui/field";
import { GOVERNORATES } from "@/lib/governorates";
import { registerAction } from "../actions";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.type));
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-extrabold">إنشاء حساب طالب</h1>
      <p className="mt-2 text-sm text-muted">سجّل لتفتح الدورات بالكود وتتابع دروسك</p>
      <ActionForm action={registerAction} className="mt-8 space-y-4" showSuccessToast={false}>
        <input type="hidden" name="next" value={next ?? ""} />
        <TextField name="name" label="الاسم الكامل" required autoComplete="name" />
        <TextField name="identifier" label="رقم الهاتف أو البريد الإلكتروني" required placeholder="07XXXXXXXXX" autoComplete="username" />
        <SelectField
          name="governorate"
          label="المحافظة"
          placeholder="اختر المحافظة (اختياري)"
          options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="password" type="password" label="كلمة المرور" required autoComplete="new-password" hint="8 أحرف على الأقل" />
          <TextField name="confirm" type="password" label="تأكيد كلمة المرور" required autoComplete="new-password" />
        </div>
        <SubmitButton className="h-12 w-full text-base" pendingText="جارٍ إنشاء الحساب...">
          إنشاء الحساب
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        لديك حساب؟{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </>
  );
}
