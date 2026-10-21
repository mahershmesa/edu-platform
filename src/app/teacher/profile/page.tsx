import type { Metadata } from "next";
import { KeyRound, Trash2, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ActionButton } from "@/components/ui/action-button";
import { TextArea, TextField } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { AvatarForm } from "./avatar-form";
import { changePassword, removeAvatar, updateProfile, uploadAvatar } from "./actions";

export const metadata: Metadata = { title: "الملف الشخصي" };

function ReadOnly({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm">{value}</div>
    </div>
  );
}

export default async function TeacherProfilePage() {
  const user = await requireTeacher();
  const [courses, lessons, exams, students] = await Promise.all([
    db.course.count({ where: { teacherId: user.id } }),
    db.lesson.count({ where: { course: { teacherId: user.id } } }),
    db.exam.count({ where: { course: { teacherId: user.id } } }),
    db.enrollment.findMany({ where: { course: { teacherId: user.id }, status: "ACTIVE" }, distinct: ["studentId"], select: { studentId: true } }),
  ]);
  const active = teacherCanEdit(user);

  return (
    <>
      <PageHeader title="الملف الشخصي" description="معلوماتك الشخصية وإعدادات الحساب" icon={<UserRound className="h-6 w-6" />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="الصورة الشخصية" />
          <CardBody className="flex flex-col items-center gap-4">
            <Avatar name={user.name} src={user.avatarUrl} size={112} />
            <div className="w-full">
              <AvatarForm action={uploadAvatar} />
            </div>
            {user.avatarUrl && (
              <ActionButton action={removeAvatar} variant="danger">
                <Trash2 className="h-3.5 w-3.5" /> إزالة الصورة
              </ActionButton>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="المعلومات الأساسية" description="تظهر للطلاب في صفحتك ودوراتك" />
          <CardBody>
            <ActionForm action={updateProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="name" label="الاسم الكامل" required defaultValue={user.name} />
                <ReadOnly label="البريد الإلكتروني" value={<span dir="ltr">{user.email ?? "—"}</span>} />
              </div>
              <TextField name="phone" label="رقم الهاتف" defaultValue={user.phone ? displayPhone(user.phone) : ""} placeholder="07XXXXXXXXX" dir="ltr" className="[&_input]:text-right" />
              <TextArea name="bio" label="نبذة شخصية" rows={4} defaultValue={user.bio ?? ""} placeholder="اكتب نبذة عن نفسك وخبراتك..." />
              <div className="flex justify-end">
                <SubmitButton>حفظ</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="تغيير كلمة المرور" icon={<KeyRound className="h-5 w-5" />} />
          <CardBody>
            <ActionForm action={changePassword} resetOnSuccess className="space-y-4">
              <TextField name="current" type="password" label="كلمة المرور الحالية" required autoComplete="current-password" />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="password" type="password" label="كلمة المرور الجديدة" required autoComplete="new-password" hint="8 أحرف على الأقل" />
                <TextField name="confirm" type="password" label="تأكيد كلمة المرور" required autoComplete="new-password" />
              </div>
              <div className="flex justify-end">
                <SubmitButton>تغيير كلمة المرور</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="معلومات الحساب" />
          <CardBody className="space-y-4">
            <ReadOnly label="نوع الحساب" value="معلم" />
            <ReadOnly
              label="حالة الحساب"
              value={<Badge tone={active ? "green" : "red"}>{active ? "نشط" : user.billingSuspended ? "موقوف (فاتورة متأخرة)" : "موقوف من الإدارة"}</Badge>}
            />
            <ReadOnly label="تاريخ الانضمام" value={formatDate(user.createdAt)} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="المعلومات المهنية" />
          <CardBody className="grid gap-4 sm:grid-cols-4">
            <ReadOnly label="إجمالي الدورات" value={formatNumber(courses)} />
            <ReadOnly label="إجمالي الدروس" value={formatNumber(lessons)} />
            <ReadOnly label="إجمالي الامتحانات" value={formatNumber(exams)} />
            <ReadOnly label="الطلاب" value={formatNumber(students.length)} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
