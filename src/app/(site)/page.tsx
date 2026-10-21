import Link from "next/link";
import { BookOpenCheck, KeyRound, PlayCircle, Sparkles, UserPlus } from "lucide-react";
import { activeBanners, activeCategories, featuredTeachers, latestCourses } from "@/server/catalog";
import { getCurrentUser } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { BannerCarousel } from "@/components/site/banner-carousel";
import { CourseGrid } from "@/components/site/course-card";
import { TeacherCard } from "@/components/site/teacher-card";
import { Section } from "@/components/site/section";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [banners, categories, teachers, courses, user] = await Promise.all([
    activeBanners(),
    activeCategories(),
    featuredTeachers(8),
    latestCourses(8),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-14 pb-4 sm:space-y-16">
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8">
        {banners.length > 0 ? (
          <BannerCarousel slides={banners.map(({ id, imageUrl, title, description, link }) => ({ id, imageUrl, title, description, link }))} />
        ) : (
          <Hero loggedIn={!!user} />
        )}
      </div>

      {categories.length > 0 && (
        <Section title="تصفّح حسب المادة" subtitle="اختر المادة والمرحلة التي تناسبك">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="card p-4">
                <Link href={`/categories/${c.id}`} className="flex items-center justify-between gap-3 hover:text-brand-700">
                  <span className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <BookOpenCheck className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-bold">{c.name}</span>
                      {c.description && <span className="line-clamp-1 text-xs text-muted">{c.description}</span>}
                    </span>
                  </span>
                </Link>
                {c.children.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.children.map((s) => (
                      <Link
                        key={s.id}
                        href={`/categories/${s.id}`}
                        className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink/80 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="أحدث الدورات" subtitle="دورات جديدة أضافها المعلمون" href="/courses">
        {courses.length > 0 ? (
          <CourseGrid courses={courses} />
        ) : (
          <div className="card">
            <EmptyState title="لا توجد دورات منشورة بعد" description="عُد قريباً، المعلمون يجهّزون المحتوى" />
          </div>
        )}
      </Section>

      {teachers.length > 0 && (
        <Section title="نخبة المعلمين" subtitle="تعلّم مع مدرسين بخبرة طويلة" href="/teachers">
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {teachers.map((t) => (
              <TeacherCard key={t.id} teacher={t} />
            ))}
          </div>
        </Section>
      )}

      <Section title="كيف تعمل المنصة؟" subtitle="ثلاث خطوات بسيطة وتبدأ التعلم">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            { icon: UserPlus, title: "سجّل حسابك", text: "أنشئ حساباً مجانياً برقم هاتفك في أقل من دقيقة." },
            { icon: KeyRound, title: "اشترِ الكود من معلمك", text: "احصل على كود الدورة من معلمك أو من المكتبات المعتمدة." },
            { icon: PlayCircle, title: "أدخل الكود وابدأ", text: "فعّل الكود لتُفتح لك الدورة وتشاهد الدروس وتؤدي الامتحانات." },
          ].map((s, i) => (
            <li key={s.title} className="card relative p-6">
              <span className="absolute top-5 left-5 text-4xl font-extrabold text-brand-100">{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
                <s.icon className="h-6 w-6" />
              </span>
              <p className="mt-4 text-lg font-bold">{s.title}</p>
              <p className="mt-1 text-sm leading-7 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-700 to-brand-500 px-6 py-10 text-white sm:px-12">
          <Sparkles className="absolute -top-4 -left-4 h-32 w-32 text-white/10" />
          <h2 className="text-2xl font-extrabold sm:text-3xl">لديك كود دورة؟</h2>
          <p className="mt-2 max-w-xl text-white/90">فعّله الآن وابدأ أول درس فوراً.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/redeem" className={buttonClass("secondary", "lg", "border-0 text-brand-700")}>
              تفعيل كود
            </Link>
            {!user && (
              <Link href="/register" className={buttonClass("ghost", "lg", "text-white ring-1 ring-white/50 hover:bg-white/10")}>
                إنشاء حساب مجاني
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Hero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 px-6 py-12 text-white sm:px-12 sm:py-20">
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "32px 32px" }}
      />
      <div className="relative max-w-2xl">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/25">منصة تعليمية عربية متكاملة</p>
        <h1 className="mt-4 text-3xl leading-tight font-extrabold sm:text-5xl">تعلّم مع أفضل المدرسين، في أي وقت ومن أي مكان</h1>
        <p className="mt-4 text-white/90 sm:text-lg">دروس فيديو منظّمة، وامتحانات تفاعلية، وتتبّع لتقدّمك في كل مادة.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/courses" className={buttonClass("secondary", "lg", "border-0 text-brand-700")}>
            تصفّح الدورات
          </Link>
          <Link
            href={loggedIn ? "/redeem" : "/register"}
            className={buttonClass("ghost", "lg", "text-white ring-1 ring-white/50 hover:bg-white/10")}
          >
            {loggedIn ? "تفعيل كود" : "ابدأ مجاناً"}
          </Link>
        </div>
      </div>
    </div>
  );
}
