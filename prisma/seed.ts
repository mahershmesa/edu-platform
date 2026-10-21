import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLES } from "../src/lib/permissions";
import { generateUniqueCodes } from "../src/lib/domain/codes";

const db = new PrismaClient();

async function main() {
  // 1) System roles (always kept in sync with the code).
  for (const r of SYSTEM_ROLES) {
    const role = await db.role.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug, name: r.name, description: r.description, isSystem: true },
      update: { name: r.name, description: r.description, isSystem: true },
    });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({ data: r.permissions.map((permission) => ({ roleId: role.id, permission })) });
  }

  // 2) First system admin.
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-please";
  await db.user.upsert({
    where: { email },
    create: { email, name: "مدير النظام", type: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
    update: {},
  });

  // 3) App versions rows.
  for (const platform of ["ANDROID", "IOS"] as const) {
    await db.appVersion.upsert({ where: { platform }, create: { platform }, update: {} });
  }

  if (process.env.SEED_DEMO === "0") return;
  if ((await db.course.count()) > 0) return; // demo data only on an empty database

  const pw = await bcrypt.hash("password123", 10);

  const science = await db.category.create({ data: { name: "العلوم", description: "الكيمياء والفيزياء والأحياء", sortOrder: 1 } });
  const chem = await db.category.create({ data: { name: "الكيمياء", parentId: science.id, sortOrder: 1 } });
  const phys = await db.category.create({ data: { name: "الفيزياء", parentId: science.id, sortOrder: 2 } });
  const math = await db.category.create({ data: { name: "الرياضيات", description: "رياضيات المراحل المتوسطة والإعدادية", sortOrder: 2 } });
  const math6 = await db.category.create({ data: { name: "السادس الإعدادي", parentId: math.id, sortOrder: 1 } });
  await db.category.create({ data: { name: "اللغة الإنكليزية", description: "قواعد ومحادثة", sortOrder: 3 } });

  const t1 = await db.user.create({
    data: {
      name: "أ. محمد مدلول",
      email: "teacher1@example.com",
      phone: "+9647700000001",
      type: "TEACHER",
      passwordHash: pw,
      bio: "مدرس كيمياء للمرحلة الإعدادية بخبرة 15 سنة.",
    },
  });
  const t2 = await db.user.create({
    data: {
      name: "أ. نشأت علي",
      email: "teacher2@example.com",
      phone: "+9647700000002",
      type: "TEACHER",
      passwordHash: pw,
      bio: "مدرس فيزياء ورياضيات، يشرح بأسلوب مبسط وتطبيقات عملية.",
    },
  });

  const courses = [
    { teacherId: t1.id, categoryId: chem.id, title: "الكيمياء - الفصل الأول", price: 25000 },
    { teacherId: t1.id, categoryId: chem.id, title: "الكيمياء - الفصل الثاني", price: 25000 },
    { teacherId: t2.id, categoryId: phys.id, title: "الفيزياء - الكهربائية", price: 30000 },
    { teacherId: t2.id, categoryId: math6.id, title: "الرياضيات - التفاضل والتكامل", price: 35000 },
  ];
  const created = [];
  for (const c of courses) {
    const course = await db.course.create({
      data: { ...c, status: "PUBLISHED", description: `شرح كامل ومبسط لمنهج ${c.title} مع حل الأسئلة الوزارية.` },
    });
    created.push(course);
    for (let i = 1; i <= 5; i++) {
      await db.lesson.create({
        data: {
          courseId: course.id,
          title: `المحاضرة ${i}`,
          sortOrder: i,
          durationMin: 30 + i * 5,
          youtubeId: "M7lc1UVf-VE",
          isFree: i === 1,
        },
      });
    }
  }

  const s1 = await db.user.create({ data: { name: "زينب أثير", phone: "+9647801111111", type: "STUDENT", passwordHash: pw, governorate: "بغداد" } });
  await db.user.create({ data: { name: "علي حسين", phone: "+9647802222222", type: "STUDENT", passwordHash: pw, governorate: "البصرة" } });

  const codes = generateUniqueCodes(10, new Set());
  for (const code of codes) {
    await db.accessCode.create({
      data: {
        code,
        teacherId: t1.id,
        groupName: "دفعة تجريبية",
        usageLimit: 1,
        courses: { create: [{ courseId: created[0].id }, { courseId: created[1].id }] },
      },
    });
  }
  // One redeemed code for the demo student.
  const redeemed = await db.accessCode.findFirstOrThrow({ where: { code: codes[0] } });
  await db.accessCode.update({ where: { id: redeemed.id }, data: { usedCount: 1 } });
  await db.codeRedemption.create({ data: { codeId: redeemed.id, studentId: s1.id, courseId: created[0].id } });
  await db.enrollment.create({ data: { studentId: s1.id, courseId: created[0].id, codeId: redeemed.id } });

  const exam = await db.exam.create({
    data: { courseId: created[0].id, title: "امتحان الفصل الأول", durationMin: 20, passPercent: 50, maxAttempts: 3 },
  });
  await db.question.create({
    data: {
      examId: exam.id,
      text: "ما هو العدد الذري للكربون؟",
      type: "SINGLE",
      sortOrder: 1,
      options: { create: [{ text: "6", isCorrect: true, sortOrder: 1 }, { text: "8", sortOrder: 2 }, { text: "12", sortOrder: 3 }] },
    },
  });
  await db.question.create({
    data: {
      examId: exam.id,
      text: "الماء مركب كيميائي.",
      type: "TRUE_FALSE",
      sortOrder: 2,
      options: { create: [{ text: "صح", isCorrect: true, sortOrder: 1 }, { text: "خطأ", sortOrder: 2 }] },
    },
  });

  const now = new Date();
  await db.teacherInvoice.create({
    data: {
      number: `INV-${now.getFullYear()}-00001`,
      teacherId: t1.id,
      amount: 150000,
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
      status: "PAID",
      paidAt: now,
      paymentNote: "نقداً",
    },
  });

  await db.banner.create({
    data: {
      imageUrl: "/banner-demo.svg",
      title: "ابدأ رحلتك مع أفضل المدرسين",
      description: "دروس فيديو وامتحانات تفاعلية لكل المراحل",
      link: "/courses",
      sortOrder: 1,
    },
  });
}

main()
  .then(() => console.log("Seed complete"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
