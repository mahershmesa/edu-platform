import type { User } from "@prisma/client";
import { SelectField, TextField } from "@/components/ui/field";
import { displayPhone } from "@/lib/phone";

export function StaffFields({ staff, roles }: { staff?: User; roles: { id: string; name: string; isActive: boolean }[] }) {
  return (
    <>
      <TextField name="name" label="الاسم" required defaultValue={staff?.name} autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="email" type="email" label="البريد الإلكتروني" dir="ltr" defaultValue={staff?.email ?? ""} autoComplete="off" />
        <TextField
          name="phone"
          label="رقم الهاتف"
          dir="ltr"
          placeholder="07XXXXXXXXX"
          defaultValue={staff?.phone ? displayPhone(staff.phone).replace(/\s/g, "") : ""}
          autoComplete="off"
        />
      </div>
      {!staff && <TextField name="password" type="password" label="كلمة المرور" required autoComplete="new-password" hint="8 أحرف على الأقل" />}
      <SelectField
        name="roleId"
        label="الدور المخصص"
        required
        placeholder="اختر الدور"
        defaultValue={staff?.roleId ?? ""}
        options={roles.map((r) => ({ value: r.id, label: r.isActive ? r.name : `${r.name} (معطّل)` }))}
        hint="يحدد الدور الأقسام التي يستطيع الموظف الوصول إليها"
      />
    </>
  );
}
