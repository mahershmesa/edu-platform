import type { Role } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { Checkbox, TextField } from "@/components/ui/field";
import { PermissionPicker } from "./permission-picker";

export function RoleFields({ role, permissions = [] }: { role?: Role; permissions?: string[] }) {
  const system = role?.isSystem ?? false;
  return (
    <>
      {system && (
        <Alert tone="info">هذا دور نظامي: صلاحياته ثابتة ولا يمكن تعديلها أو حذفه، يمكنك فقط تفعيله أو تعطيله.</Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="اسم الدور" required defaultValue={role?.name} disabled={system} />
        <TextField
          name="slug"
          label="المعرّف"
          dir="ltr"
          defaultValue={role?.slug}
          disabled={system}
          placeholder="support-team"
          hint="أحرف لاتينية؛ يُولّد تلقائياً إن تُرك فارغاً"
        />
      </div>
      <TextField name="description" label="الوصف" defaultValue={role?.description ?? ""} disabled={system} />
      <Checkbox name="isActive" label="الدور نشط" defaultChecked={role?.isActive ?? true} />
      <PermissionPicker defaultSelected={permissions} disabled={system} />
    </>
  );
}
