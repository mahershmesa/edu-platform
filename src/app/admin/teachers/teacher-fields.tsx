import type { User } from "@prisma/client";
import { Field, TextArea, TextField } from "@/components/ui/field";
import { displayPhone } from "@/lib/phone";

export function TeacherFields({ teacher }: { teacher?: User }) {
  return (
    <>
      <TextField name="name" label="الاسم الكامل" required defaultValue={teacher?.name} autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="email" type="email" label="البريد الإلكتروني" dir="ltr" defaultValue={teacher?.email ?? ""} autoComplete="off" />
        <TextField
          name="phone"
          label="رقم الهاتف"
          dir="ltr"
          placeholder="07XXXXXXXXX"
          defaultValue={teacher?.phone ? displayPhone(teacher.phone).replace(/\s/g, "") : ""}
          autoComplete="off"
        />
      </div>
      {!teacher && <TextField name="password" type="password" label="كلمة المرور" required autoComplete="new-password" hint="8 أحرف على الأقل" />}
      <TextArea name="bio" label="نبذة عن المعلم" defaultValue={teacher?.bio ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="avatarFile" label="رفع صورة" hint="JPG أو PNG أو WebP حتى 5MB">
          <input id="avatarFile" name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" className="input py-2" />
        </Field>
        <TextField name="avatarUrl" label="أو رابط الصورة" dir="ltr" placeholder="https://..." defaultValue={teacher?.avatarUrl ?? ""} />
      </div>
    </>
  );
}
