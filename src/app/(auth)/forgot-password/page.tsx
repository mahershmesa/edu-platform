import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { displayPhone } from "@/lib/phone";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "نسيت كلمة المرور" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const s = await getSettings();
  const wa = s.whatsapp.replace(/\D/g, "");
  return (
    <>
      <h1 className="text-3xl font-extrabold">نسيت كلمة المرور؟</h1>
      <p className="mt-3 leading-7 text-muted">
        تواصل مع فريق الدعم وأرسل لهم اسمك ورقم هاتفك المسجل، وسيعيدون تعيين كلمة المرور لك.
      </p>
      <div className="mt-8 space-y-3">
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full")}>
            <MessageCircle className="h-5 w-5" /> تواصل عبر واتساب
          </a>
        )}
        {s.supportPhone && (
          <a href={`tel:${s.supportPhone}`} className={buttonClass("secondary", "lg", "w-full")}>
            <Phone className="h-5 w-5" /> اتصل بالدعم: {displayPhone(s.supportPhone)}
          </a>
        )}
        {!wa && !s.supportPhone && <p className="rounded-xl bg-surface p-4 text-sm text-muted">تواصل مع إدارة المنصة لإعادة تعيين كلمة المرور.</p>}
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </>
  );
}
