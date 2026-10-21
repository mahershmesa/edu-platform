import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Laptop, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { GOVERNORATES } from "@/lib/governorates";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { SelectField, TextField } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Avatar } from "@/components/ui/avatar";
import { changePasswordAction, removeDeviceAction, updateProfileAction } from "../actions";
import { DEVICE_REMOVAL_HOURS } from "@/components/site/constants";

export const metadata: Metadata = { title: "حسابي", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser();
  const [devices, settings] = await Promise.all([
    db.device.findMany({ where: { userId: user.id }, orderBy: { lastSeenAt: "desc" } }),
    getSettings(),
  ]);
  const fp = (await cookies()).get("asaas_device")?.value;
  const isStudent = user.type === "STUDENT";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} src={user.avatarUrl} size={64} />
        <div>
          <h1 className="text-2xl font-extrabold">حسابي</h1>
          <p className="text-sm text-muted" dir="ltr">
            {user.phone ? displayPhone(user.phone) : user.email}
          </p>
          <p className="text-xs text-muted">عضو منذ {formatDate(user.createdAt)}</p>
        </div>
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold">البيانات الشخصية</h2>
        <ActionForm action={updateProfileAction} className="mt-4 space-y-4">
          <TextField name="name" label="الاسم الكامل" required defaultValue={user.name} autoComplete="name" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="contact"
              label={user.phone ? "رقم الهاتف" : "البريد الإلكتروني"}
              defaultValue={user.phone ? displayPhone(user.phone) : (user.email ?? "")}
              disabled
              hint="لتغييره تواصل مع الدعم"
              dir="ltr"
            />
            <SelectField
              name="governorate"
              label="المحافظة"
              placeholder="غير محددة"
              defaultValue={user.governorate ?? ""}
              options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton>حفظ البيانات</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold">تغيير كلمة المرور</h2>
        <ActionForm action={changePasswordAction} resetOnSuccess className="mt-4 space-y-4">
          <TextField name="current" type="password" label="كلمة المرور الحالية" required autoComplete="current-password" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="password" type="password" label="كلمة المرور الجديدة" required autoComplete="new-password" hint="8 أحرف على الأقل" />
            <TextField name="confirm" type="password" label="تأكيد كلمة المرور" required autoComplete="new-password" />
          </div>
          <div className="flex justify-end">
            <SubmitButton>تغيير كلمة المرور</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="h-5 w-5 text-brand-600" /> الأجهزة المسجلة
            </h2>
            {isStudent && (
              <p className="mt-1 text-sm leading-6 text-muted">
                يمكنك استخدام حسابك على {formatNumber(settings.maxDevices)} أجهزة كحد أقصى. يمكنك إزالة جهاز مرة واحدة كل{" "}
                {formatNumber(DEVICE_REMOVAL_HOURS)} ساعة.
              </p>
            )}
          </div>
          {isStudent && (
            <Badge tone={devices.length >= settings.maxDevices ? "amber" : "green"}>
              {formatNumber(devices.length)} من {formatNumber(settings.maxDevices)}
            </Badge>
          )}
        </div>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {devices.length === 0 && <li className="p-4 text-sm text-muted">لا توجد أجهزة مسجلة.</li>}
          {devices.map((d) => {
            const current = d.fingerprint === fp;
            const mobile = /أندرويد|آيفون/.test(d.label);
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-muted">
                  {mobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {d.label} {current && <Badge tone="green">هذا الجهاز</Badge>}
                  </p>
                  <p className="text-xs text-muted">آخر نشاط: {formatDateTime(d.lastSeenAt)}</p>
                </div>
                {!current && (
                  <ConfirmAction
                    title="تسجيل الخروج من الجهاز"
                    message={`سيتم تسجيل الخروج من "${d.label}" وإزالته من أجهزتك.${isStudent ? ` لا يمكنك إزالة جهاز آخر قبل ${DEVICE_REMOVAL_HOURS} ساعة.` : ""}`}
                    action={removeDeviceAction.bind(null, d.id)}
                    confirmLabel="تسجيل الخروج"
                    trigger={
                      <Button variant="danger" size="sm">
                        <LogOut className="h-3.5 w-3.5" /> تسجيل الخروج من هذا الجهاز
                      </Button>
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
