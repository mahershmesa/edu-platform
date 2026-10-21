import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          → العودة إلى الصفحة الرئيسية
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "36px 36px" }}
        />
        <LogoMark className="relative h-36 w-36 text-white drop-shadow-xl" />
        <p className="relative mt-6 text-4xl font-extrabold text-white">أساس أكاديمي</p>
        <p className="relative mt-2 text-lg text-white/85">منصة تعليمية عربية متكاملة</p>
      </div>
    </div>
  );
}
