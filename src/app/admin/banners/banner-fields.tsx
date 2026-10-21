import type { Banner } from "@prisma/client";
import { Checkbox, Field, TextArea, TextField } from "@/components/ui/field";

/** datetime-local value in Baghdad time is overkill here; dates are day-precision. */
function d(v: Date | null | undefined) {
  return v ? new Date(v).toISOString().slice(0, 10) : "";
}

export function BannerFields({ banner }: { banner?: Banner }) {
  return (
    <>
      <Field
        name="imageFile"
        label="صورة الإعلان"
        required={!banner}
        hint="الحد الأقصى 5MB · المقاس المقترح 1600×600 · اترك الحقلين كما هما للإبقاء على الصورة الحالية"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <input id="imageFile" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input py-2 text-xs" />
          <input name="imageUrl" dir="ltr" placeholder="أو الصق رابط الصورة" defaultValue={banner?.imageUrl ?? ""} className="input" aria-label="رابط الصورة" />
        </div>
      </Field>
      <TextField name="title" label="العنوان" defaultValue={banner?.title ?? ""} />
      <TextArea name="description" label="الوصف" defaultValue={banner?.description ?? ""} rows={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="link" label="الرابط عند الضغط" dir="ltr" placeholder="/courses أو https://..." defaultValue={banner?.link ?? ""} />
        <TextField name="sortOrder" label="الترتيب" type="number" min={0} defaultValue={banner?.sortOrder ?? 0} />
        <TextField name="startsAt" label="يبدأ العرض في" type="date" defaultValue={d(banner?.startsAt)} hint="اختياري" />
        <TextField name="endsAt" label="ينتهي العرض في" type="date" defaultValue={d(banner?.endsAt)} hint="اختياري" />
      </div>
      <Checkbox name="isActive" label="الإعلان مفعّل" defaultChecked={banner?.isActive ?? true} />
    </>
  );
}
