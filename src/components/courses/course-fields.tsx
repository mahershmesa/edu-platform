import type { Course } from "@prisma/client";
import { Field, SelectField, TextArea, TextField } from "@/components/ui/field";
import type { CategoryOption } from "@/server/courses";

export function CourseFields({
  course,
  categories,
  teachers,
}: {
  course?: Pick<Course, "title" | "description" | "price" | "categoryId" | "imageUrl" | "status" | "teacherId">;
  categories: CategoryOption[];
  /** Only for admins: show a teacher select. */
  teachers?: { id: string; name: string }[];
}) {
  return (
    <>
      <TextField name="title" label="عنوان الدورة" required defaultValue={course?.title} maxLength={120} />
      <TextArea name="description" label="وصف الدورة" defaultValue={course?.description ?? ""} rows={4} />
      {teachers && (
        <SelectField
          name="teacherId"
          label="المعلم"
          required
          placeholder="اختر المعلم"
          defaultValue={course?.teacherId ?? ""}
          options={teachers.map((t) => ({ value: t.id, label: t.name }))}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="price"
          label="السعر (دينار عراقي)"
          required
          type="number"
          min={0}
          step={250}
          inputMode="numeric"
          defaultValue={course?.price ?? 0}
          hint="اكتب 0 لدورة مجانية"
        />
        <Field name="categoryId" label="الفئة" required>
          <select id="categoryId" name="categoryId" required defaultValue={course?.categoryId ?? ""} className="input">
            <option value="">اختر الفئة</option>
            {categories.map((root) =>
              root.children.length === 0 ? (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ) : (
                <optgroup key={root.id} label={root.name}>
                  <option value={root.id}>{root.name} (عام)</option>
                  {root.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ),
            )}
          </select>
        </Field>
      </div>
      <SelectField
        name="status"
        label="الحالة"
        defaultValue={course?.status ?? "DRAFT"}
        options={[
          { value: "DRAFT", label: "مسودة (لا تظهر للطلاب)" },
          { value: "PUBLISHED", label: "منشورة" },
          { value: "HIDDEN", label: "مخفية" },
        ]}
      />
      <Field name="imageFile" label="صورة الدورة" hint="الحد الأقصى 5MB · JPG أو PNG أو WebP أو GIF · المقاس المقترح 800×600">
        <div className="grid gap-2 sm:grid-cols-2">
          <input id="imageFile" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input py-2 text-xs" />
          <input
            name="imageUrl"
            dir="ltr"
            placeholder="أو الصق رابط الصورة https://..."
            defaultValue={course?.imageUrl ?? ""}
            className="input"
            aria-label="رابط الصورة"
          />
        </div>
      </Field>
    </>
  );
}
