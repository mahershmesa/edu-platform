import type { TeacherInvoice } from "@prisma/client";
import { toDateInput } from "@/lib/format";
import { SelectField, TextArea, TextField } from "@/components/ui/field";

function defaults() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const due = new Date(now.getFullYear(), now.getMonth(), 10);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end), due: iso(due) };
}

export function InvoiceFields({
  invoice,
  teachers,
}: {
  invoice?: TeacherInvoice;
  teachers?: { id: string; name: string }[];
}) {
  const d = defaults();
  return (
    <>
      {teachers && (
        <SelectField name="teacherId" label="المعلم" required placeholder="اختر المعلم" options={teachers.map((t) => ({ value: t.id, label: t.name }))} />
      )}
      <TextField
        name="amount"
        label="المبلغ (دينار عراقي)"
        type="number"
        min={0}
        step={250}
        required
        defaultValue={invoice?.amount ?? ""}
        hint="0 = اشتراك مجاني"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="periodStart" label="بداية الفترة" type="date" required defaultValue={invoice ? toDateInput(invoice.periodStart) : d.start} />
        <TextField name="periodEnd" label="نهاية الفترة" type="date" required defaultValue={invoice ? toDateInput(invoice.periodEnd) : d.end} />
        <TextField name="dueDate" label="تاريخ الاستحقاق" type="date" required defaultValue={invoice ? toDateInput(invoice.dueDate) : d.due} />
      </div>
      {!invoice && (
        <SelectField
          name="status"
          label="الحالة"
          defaultValue="DUE"
          options={[
            { value: "DUE", label: "مستحقة (تظهر للمعلم مباشرة)" },
            { value: "DRAFT", label: "مسودة (لا تظهر للمعلم)" },
          ]}
        />
      )}
      <TextArea name="notes" label="ملاحظات" defaultValue={invoice?.notes ?? ""} placeholder="مثال: اشتراك شهر آذار" />
    </>
  );
}
