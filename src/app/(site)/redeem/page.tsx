import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { RedeemForm } from "@/components/site/redeem-form";
import { ContactLinks } from "@/components/site/contact-links";

export const metadata: Metadata = { title: "تفعيل كود" };

export default async function RedeemPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/redeem");
  if (user.type !== "STUDENT") redirect(homeFor(user.type));
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <div className="card p-6 sm:p-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
          <KeyRound className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">تفعيل كود دورة</h1>
        <p className="mt-2 leading-7 text-muted">
          أدخل الكود الذي حصلت عليه من معلمك. إن كان الكود يفتح أكثر من دورة، ستُفتح لك كلها مرة واحدة.
        </p>
        <div className="mt-6">
          <RedeemForm />
        </div>
        <div className="mt-8 border-t border-line pt-5 text-sm text-muted">
          <p>ليس لديك كود؟ اشترِه من معلمك، أو تواصل معنا:</p>
          <div className="mt-3">
            <ContactLinks />
          </div>
          <Link href="/courses" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
            تصفّح الدورات ←
          </Link>
        </div>
      </div>
    </div>
  );
}
