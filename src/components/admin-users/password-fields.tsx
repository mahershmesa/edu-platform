import { TextField } from "@/components/ui/field";

export function PasswordFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="password" type="password" label="كلمة المرور الجديدة" required autoComplete="new-password" hint="8 أحرف على الأقل" />
      <TextField name="confirm" type="password" label="تأكيد كلمة المرور" required autoComplete="new-password" />
    </div>
  );
}
