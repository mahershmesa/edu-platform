import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { displayPhone } from "@/lib/phone";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextArea, TextField } from "@/components/ui/field";
import { saveSettingsAction } from "./actions";

export const metadata: Metadata = { title: "الإعدادات" };

function phoneInput(p: string) {
  return p ? displayPhone(p).replace(/\s/g, "") : "";
}

export default async function SettingsPage() {
  const user = await requirePermission("settings.read");
  const s = await getSettings();
  const editable = can(user, "settings.write");
  return (
    <>
      <PageHeader title="الإعدادات العامة" description="إعدادات المنصة وقواعد الاشتراكات والأجهزة" icon={<Settings className="h-6 w-6" />} />
      <ActionForm action={saveSettingsAction} className="space-y-6">
        <fieldset disabled={!editable} className="space-y-6">
          <Card>
            <CardHeader title="المنصة" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <TextField name="platformName" label="اسم المنصة" required defaultValue={s.platformName} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="الاشتراكات والأجهزة" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="graceDays"
                type="number"
                min={0}
                max={90}
                label="مهلة السماح للفواتير (أيام)"
                defaultValue={s.graceDays}
                hint="بعد تاريخ الاستحقاق بهذا العدد من الأيام يُوقف حساب المعلم تلقائياً"
              />
              <TextField
                name="maxDevices"
                type="number"
                min={1}
                max={10}
                label="الحد الأقصى لأجهزة الطالب"
                defaultValue={s.maxDevices}
                hint="عدد الأجهزة التي يستطيع الطالب الدخول منها"
              />
              <TextArea
                name="paymentInstructions"
                label="تعليمات الدفع للمعلمين"
                className="sm:col-span-2"
                defaultValue={s.paymentInstructions}
                hint="تظهر للمعلم في صفحة الفواتير"
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="التواصل والدعم" description="تظهر للطلاب في صفحة نسيت كلمة المرور وفي الموقع" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <TextField name="whatsapp" label="رقم واتساب الدعم" dir="ltr" placeholder="07XXXXXXXXX" defaultValue={phoneInput(s.whatsapp)} />
              <TextField name="supportPhone" label="هاتف الدعم" dir="ltr" placeholder="07XXXXXXXXX" defaultValue={phoneInput(s.supportPhone)} />
            </CardBody>
          </Card>
        </fieldset>
        {editable && (
          <div className="flex justify-end">
            <SubmitButton>حفظ الإعدادات</SubmitButton>
          </div>
        )}
      </ActionForm>
    </>
  );
}
