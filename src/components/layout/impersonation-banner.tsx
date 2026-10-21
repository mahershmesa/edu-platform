import { Eye } from "lucide-react";
import { stopImpersonationAction } from "@/app/(auth)/actions";

export function ImpersonationBanner({ adminName, teacherName }: { adminName: string; teacherName: string }) {
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900">
      <Eye className="h-4 w-4" />
      <span>
        أنت ({adminName}) تتصفح بصفة المعلم <b>{teacherName}</b>. كل عملية تُسجَّل باسمك.
      </span>
      <form action={stopImpersonationAction}>
        <button type="submit" className="rounded-lg border border-sky-300 bg-white px-3 py-1 font-semibold hover:bg-sky-100">
          الخروج من وضع المعلم
        </button>
      </form>
    </div>
  );
}
