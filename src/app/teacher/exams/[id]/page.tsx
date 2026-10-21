/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, BarChart3, CheckCircle2, ClipboardList, Pencil, Plus, Power, Settings2, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireTeacher, teacherCanEdit } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { QUESTION_TYPE_LABELS } from "@/lib/domain/exams";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { ExamSettingsFields } from "@/components/exams/exam-settings-fields";
import { QuestionDialog } from "@/components/exams/question-dialog";
import { deleteExam, deleteQuestion, moveQuestion, saveQuestion, toggleExamActive, updateExam } from "../actions";

export const metadata: Metadata = { title: "تعديل الامتحان" };

export default async function ExamBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  const { id } = await params;
  const exam = await db.exam.findFirst({
    where: { id, course: { teacherId: user.id } },
    include: {
      course: { select: { id: true, title: true, lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } } } },
      lesson: { select: { title: true } },
      questions: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { options: { orderBy: { sortOrder: "asc" } } } },
      _count: { select: { attempts: { where: { submittedAt: { not: null } } } } },
    },
  });
  if (!exam) notFound();
  const editable = teacherCanEdit(user);
  const totalPoints = exam.questions.reduce((n, q) => n + q.points, 0);

  return (
    <>
      <PageHeader
        title={exam.title}
        description={`${exam.course.title}${exam.lesson ? ` · ${exam.lesson.title}` : ""}`}
        icon={<ClipboardList className="h-6 w-6" />}
        actions={
          <>
            <LinkButton href={`/teacher/exams/${exam.id}/results`} variant="secondary">
              <BarChart3 className="h-4 w-4" /> النتائج ({formatNumber(exam._count.attempts)})
            </LinkButton>
            {editable && (
              <ActionButton action={toggleExamActive.bind(null, exam.id)} variant={exam.isActive ? "secondary" : "primary"} size="md">
                <Power className="h-4 w-4" /> {exam.isActive ? "إيقاف الامتحان" : "تفعيل الامتحان"}
              </ActionButton>
            )}
          </>
        }
      />

      {exam._count.attempts > 0 && editable && (
        <Alert tone="info" className="mb-5">
          أدّى الطلاب هذا الامتحان {formatNumber(exam._count.attempts)} مرة. تعديل الأسئلة لا يغيّر درجات المحاولات السابقة.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={`الأسئلة (${formatNumber(exam.questions.length)})`}
              description={`مجموع النقاط: ${formatNumber(totalPoints)}`}
              action={
                editable && (
                  <QuestionDialog
                    title="إضافة سؤال جديد"
                    action={saveQuestion.bind(null, exam.id, null)}
                    trigger={
                      <Button size="sm">
                        <Plus className="h-4 w-4" /> إضافة سؤال
                      </Button>
                    }
                  />
                )
              }
            />
            <CardBody className="space-y-3">
              {exam.questions.length === 0 ? (
                <EmptyState title="لا توجد أسئلة بعد" description="ابدأ بإضافة سؤال جديد. الامتحان لا يظهر للطلاب بدون أسئلة." />
              ) : (
                exam.questions.map((q, i) => (
                  <div key={q.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 font-bold text-white">{formatNumber(i + 1)}</span>
                          <Badge tone="blue">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                          <span>{formatNumber(q.points)} نقطة</span>
                        </div>
                        <p className="font-semibold leading-7 whitespace-pre-line">{q.text}</p>
                        {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-2 max-h-48 rounded-lg border border-line" />}
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                          {q.options.map((o) => (
                            <li
                              key={o.id}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${o.isCorrect ? "border-brand-300 bg-brand-50 font-semibold text-brand-800" : "border-line"}`}
                            >
                              {o.isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                              {o.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {editable && (
                        <div className="flex shrink-0 gap-1">
                          <ActionButton action={moveQuestion.bind(null, exam.id, q.id, "up")} variant="ghost" size="icon" className={i === 0 ? "invisible" : ""}>
                            <ArrowUp className="h-4 w-4" aria-label="تحريك للأعلى" />
                          </ActionButton>
                          <ActionButton
                            action={moveQuestion.bind(null, exam.id, q.id, "down")}
                            variant="ghost"
                            size="icon"
                            className={i === exam.questions.length - 1 ? "invisible" : ""}
                          >
                            <ArrowDown className="h-4 w-4" aria-label="تحريك للأسفل" />
                          </ActionButton>
                          <QuestionDialog
                            title={`تعديل السؤال ${i + 1}`}
                            action={saveQuestion.bind(null, exam.id, q.id)}
                            question={{
                              text: q.text,
                              type: q.type,
                              points: q.points,
                              imageUrl: q.imageUrl,
                              options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
                            }}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="تعديل">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <ConfirmAction
                            title="حذف السؤال"
                            message="هل تريد حذف هذا السؤال؟"
                            action={deleteQuestion.bind(null, exam.id, q.id)}
                            confirmLabel="حذف"
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="حذف" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="إعدادات الامتحان"
              icon={<Settings2 className="h-5 w-5" />}
              action={
                editable && (
                  <FormDialog
                    title="تعديل إعدادات الامتحان"
                    action={updateExam.bind(null, exam.id)}
                    size="lg"
                    trigger={
                      <Button variant="secondary" size="sm">
                        <Pencil className="h-3.5 w-3.5" /> تعديل
                      </Button>
                    }
                  >
                    <ExamSettingsFields exam={exam} lessons={exam.course.lessons} />
                  </FormDialog>
                )
              }
            />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Row label="الحالة">
                  <Badge tone={exam.isActive ? "green" : "gray"}>{exam.isActive ? "متاح للطلاب" : "غير متاح"}</Badge>
                </Row>
                <Row label="المدة">{formatNumber(exam.durationMin)} دقيقة</Row>
                <Row label="درجة النجاح">{formatNumber(exam.passPercent)}%</Row>
                <Row label="عدد المحاولات">{exam.maxAttempts ? formatNumber(exam.maxAttempts) : "بلا حد"}</Row>
                <Row label="ترتيب عشوائي">{exam.shuffle ? "نعم" : "لا"}</Row>
                <Row label="إظهار الإجابات">{exam.showAnswers ? "نعم، بعد التسليم" : "لا"}</Row>
                <Row label="الدرس المرتبط">{exam.lesson?.title ?? "الدورة كاملة"}</Row>
              </dl>
              {exam.description && <p className="mt-4 rounded-lg bg-surface p-3 text-sm leading-7 text-muted">{exam.description}</p>}
            </CardBody>
          </Card>
          {editable && (
            <ConfirmAction
              title="حذف الامتحان"
              message="سيتم حذف الامتحان وكل أسئلته ومحاولات الطلاب ونتائجهم نهائياً."
              action={deleteExam.bind(null, exam.id)}
              confirmLabel="حذف نهائياً"
              trigger={
                <Button variant="danger" className="w-full">
                  <Trash2 className="h-4 w-4" /> حذف الامتحان
                </Button>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
