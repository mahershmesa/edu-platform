import { InstallAppButton } from "@/components/pwa/install-app";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { displayPhone } from "@/lib/phone";
import { LogoMark } from "@/components/layout/logo";

export async function SiteFooter() {
  const s = await getSettings();
  const wa = s.whatsapp.replace(/\D/g, "");
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-brand-700">
            <LogoMark className="h-10 w-10" />
            <span className="text-lg font-extrabold text-ink">{s.platformName}</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
            منصة تعليمية عربية تجمعك بأفضل المدرسين: دروس فيديو منظمة، وامتحانات تفاعلية، وتتبّع لتقدّمك خطوة بخطوة.
          </p>
          <InstallAppButton className="mt-4" />
        </div>
        <div>
          <p className="font-bold">روابط سريعة</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted">
            <li><Link href="/courses" className="hover:text-brand-700">الدورات</Link></li>
            <li><Link href="/teachers" className="hover:text-brand-700">المعلمون</Link></li>
            <li><Link href="/redeem" className="hover:text-brand-700">تفعيل كود</Link></li>
            <li><Link href="/my-courses" className="hover:text-brand-700">دوراتي</Link></li>
            <li><Link href="/register" className="hover:text-brand-700">إنشاء حساب</Link></li>
            <li><Link href="/login" className="hover:text-brand-700">تسجيل الدخول</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-bold">تواصل معنا</p>
          <div className="mt-3 space-y-2 text-sm">
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted hover:text-brand-700">
                <MessageCircle className="h-4 w-4 text-brand-600" /> واتساب الدعم
              </a>
            )}
            {s.supportPhone && (
              <a href={`tel:${s.supportPhone}`} className="flex items-center gap-2 text-muted hover:text-brand-700">
                <Phone className="h-4 w-4 text-brand-600" /> <span dir="ltr">{displayPhone(s.supportPhone)}</span>
              </a>
            )}
            {!wa && !s.supportPhone && <p className="text-muted">لأي استفسار تواصل مع معلمك أو إدارة المنصة.</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {s.platformName}. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
