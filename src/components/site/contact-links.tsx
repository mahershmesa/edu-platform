import { MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { displayPhone } from "@/lib/phone";

export async function ContactLinks() {
  const s = await getSettings();
  const wa = s.whatsapp.replace(/\D/g, "");
  if (!wa && !s.supportPhone) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-surface"
        >
          <MessageCircle className="h-4 w-4 text-brand-600" /> واتساب
        </a>
      )}
      {s.supportPhone && (
        <a
          href={`tel:${s.supportPhone}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-surface"
        >
          <Phone className="h-4 w-4 text-brand-600" /> <span dir="ltr">{displayPhone(s.supportPhone)}</span>
        </a>
      )}
    </div>
  );
}
