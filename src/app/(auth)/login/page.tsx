import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.type));
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-extrabold">تسجيل الدخول</h1>
      <p className="mt-2 text-sm text-muted">أدخل بياناتك للوصول إلى حسابك</p>
      <div className="mt-8">
        <LoginForm next={next ?? ""} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        ليس لديك حساب؟{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-brand-700 hover:underline">
          إنشاء حساب
        </Link>
      </p>
    </>
  );
}
