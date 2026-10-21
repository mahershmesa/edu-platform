import type { User } from "@prisma/client";
import { SelectField, TextField } from "@/components/ui/field";
import { GOVERNORATES } from "@/lib/governorates";
import { displayPhone } from "@/lib/phone";

export function StudentFields({ student }: { student?: User }) {
  return (
    <>
      <TextField name="name" label="الاسم الكامل" required defaultValue={student?.name} autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="phone"
          label="رقم الهاتف"
          dir="ltr"
          placeholder="07XXXXXXXXX"
          defaultValue={student?.phone ? displayPhone(student.phone).replace(/\s/g, "") : ""}
          autoComplete="off"
        />
        <TextField name="email" type="email" label="البريد الإلكتروني" dir="ltr" defaultValue={student?.email ?? ""} autoComplete="off" />
      </div>
      <SelectField
        name="governorate"
        label="المحافظة"
        placeholder="غير محددة"
        defaultValue={student?.governorate ?? ""}
        options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
      />
      {!student && <TextField name="password" type="password" label="كلمة المرور" required autoComplete="new-password" hint="8 أحرف على الأقل" />}
    </>
  );
}
