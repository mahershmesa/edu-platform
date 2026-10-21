import type { Category } from "@prisma/client";
import { Checkbox, TextArea, TextField } from "@/components/ui/field";

export function CategoryFields({ category, parentId }: { category?: Category; parentId?: string }) {
  return (
    <>
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <TextField name="name" label="اسم الفئة" required defaultValue={category?.name} />
      <TextArea name="description" label="الوصف" defaultValue={category?.description ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="imageUrl" label="رابط الصورة أو الأيقونة" dir="ltr" defaultValue={category?.imageUrl ?? ""} placeholder="https://..." />
        <TextField name="sortOrder" label="الترتيب" type="number" min={0} defaultValue={category?.sortOrder ?? 0} />
      </div>
      <TextField
        name="introVideo"
        label="فيديو تعريفي (يوتيوب)"
        dir="ltr"
        defaultValue={category?.introVideo ?? ""}
        placeholder="https://www.youtube.com/watch?v=..."
        hint="اختياري"
      />
      <Checkbox name="isActive" label="الفئة نشطة (تظهر للطلاب)" defaultChecked={category?.isActive ?? true} />
    </>
  );
}
