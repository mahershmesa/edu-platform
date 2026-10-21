import type { Metadata } from "next";
import { Apple, Smartphone } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextField } from "@/components/ui/field";
import { saveAppVersion } from "./actions";

export const metadata: Metadata = { title: "إعدادات التطبيق" };

const PLATFORMS = [
  { key: "ANDROID", title: "جوجل بلاي", sub: "رابط التحميل وإصدار التطبيق على Google Play", placeholder: "https://play.google.com/store/apps/details?id=...", Icon: Smartphone },
  { key: "IOS", title: "أبل ستور", sub: "رابط التحميل وإصدار التطبيق على App Store", placeholder: "https://apps.apple.com/app/id...", Icon: Apple },
] as const;

export default async function AppSettingsPage() {
  const user = await requirePermission("app.read");
  const editable = can(user, "app.write");
  const rows = await db.appVersion.findMany();
  const byPlatform = new Map(rows.map((r) => [r.platform, r]));

  return (
    <>
      <PageHeader
        title="إعدادات التطبيق"
        description="روابط وإصدارات تطبيق الجوال في المتاجر وتحديد التحديث الإجباري"
        icon={<Smartphone className="h-6 w-6" />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {PLATFORMS.map(({ key, title, sub, placeholder, Icon }) => {
          const row = byPlatform.get(key);
          return (
            <Card key={key}>
              <CardHeader
                title={title}
                description={sub}
                icon={<Icon className="h-5 w-5" />}
                action={row?.forceUpdate ? <Badge tone="red">تحديث إجباري</Badge> : <Badge>تحديث عادي</Badge>}
              />
              <CardBody>
                <ActionForm action={saveAppVersion.bind(null, key)} className="space-y-4">
                  <fieldset disabled={!editable} className="space-y-4">
                    <TextField name="storeUrl" label="رابط تحميل التطبيق" dir="ltr" placeholder={placeholder} defaultValue={row?.storeUrl ?? ""} />
                    <TextField name="version" label="رقم الإصدار" dir="ltr" placeholder="1.0.0" defaultValue={row?.version ?? ""} />
                    <div>
                      <p className="label">نوع التحديث لهذا الإصدار</p>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line p-3 text-sm font-semibold has-[:checked]:border-red-300 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                          <input type="radio" name="updateType" value="force" defaultChecked={row?.forceUpdate ?? false} className="accent-red-600" />
                          تحديث إجباري
                        </label>
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line p-3 text-sm font-semibold has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                          <input type="radio" name="updateType" value="normal" defaultChecked={!row?.forceUpdate} className="accent-brand-600" />
                          تحديث عادي فقط
                        </label>
                      </div>
                      <p className="mt-1.5 text-xs text-muted">الإجباري يمنع استخدام التطبيق حتى يُحدَّث، والعادي يظهر تنبيهاً فقط.</p>
                    </div>
                  </fieldset>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">آخر تحديث: {formatDateTime(row?.updatedAt)}</span>
                    {editable && <SubmitButton>حفظ التغييرات</SubmitButton>}
                  </div>
                </ActionForm>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
