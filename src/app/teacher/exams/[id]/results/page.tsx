import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, Percent, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Table } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";

export const metadata: Metadata = { title: "نتائج الامتحان" };

function minutesBetween(a: Date, b: Date) {
  const sec = Math.max(0, Math.round((b.getTime() - a.getTime()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  const { id } = await params;
  const exam = await db.exam.findFirst({
    where: { id, course: { teacherId: user.id } },
    include: { course: { select: { title: true } } },
  });
  if (!exam) notFound();

  const attempts = await db.examAttempt.findMany({
    where: { examId: exam.id, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    include: { student: { select: { name: true, phone: true, email: true, avatarUrl: true } } },
    take: 500,
  });

  const percents = attempts.map((a) => (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0));
  const avg = percents.length ? Math.round(percents.reduce((x, y) => x + y, 0) / percents.length) : 0;
  const passed = attempts.filter((a) => a.passed).length;
  const passRate = attempts.length ? Math.round((passed / attempts.length) * 100) : 0;
  const students = new Set(attempts.map((a) => a.studentId)).size;

  return (
    <>
      <PageHeader
        title={`نتائج: ${exam.title}`}
        description={exam.course.title}
        icon={<BarChart3 className="h-6 w-6" />}
        actions={
          <LinkButton href={`/teacher/exams/${exam.id}`} variant="secondary">
            <ArrowRight className="h-4 w-4" /> العودة للامتحان
          </LinkButton>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="المحاولات المسلّمة" value={formatNumber(attempts.length)} icon={<BarChart3 className="h-6 w-6" />} />
        <StatCard label="عدد الطلاب" value={formatNumber(students)} icon={<Users className="h-6 w-6" />} tone="blue" />
        <StatCard label="متوسط الدرجات" value={`${formatNumber(avg)}%`} icon={<Percent className="h-6 w-6" />} tone="purple" />
        <StatCard label="نسبة النجاح" value={`${formatNumber(passRate)}%`} icon={<CheckCircle2 className="h-6 w-6" />} tone="teal" />
      </div>

      <div className="card p-4 sm:p-5">
        {attempts.length === 0 ? (
          <EmptyState title="لا توجد محاولات بعد" description="ستظهر هنا نتائج الطلاب بعد تسليمهم للامتحان." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الدرجة</th>
                <th>النسبة</th>
                <th>النتيجة</th>
                <th>الوقت المستغرق</th>
                <th>تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={a.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.student.name} src={a.student.avatarUrl} size={32} />
                      <div>
                        <p className="font-semibold">{a.student.name}</p>
                        <p className="text-xs text-muted" dir="ltr">
                          {a.student.phone ? displayPhone(a.student.phone) : a.student.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="tabular-nums">
                    {formatNumber(a.score ?? 0)} / {formatNumber(a.maxScore ?? 0)}
                  </td>
                  <td className="tabular-nums font-semibold">{formatNumber(percents[i])}%</td>
                  <td>
                    <Badge tone={a.passed ? "green" : "red"}>{a.passed ? "ناجح" : "راسب"}</Badge>
                  </td>
                  <td className="tabular-nums" dir="ltr">
                    {minutesBetween(a.startedAt, a.submittedAt!)}
                  </td>
                  <td className="text-xs text-muted">{formatDateTime(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
