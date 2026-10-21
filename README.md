# أساس أكاديمي

منصة تعليمية عربية متكاملة: لوحة للمدير، ولوحة للمعلم، ومنصة للطالب لمشاهدة الدروس وأداء الامتحانات، مع فتح الدورات بالأكواد.

- المواصفات الكاملة: [docs/SPEC.md](docs/SPEC.md)
- التقنيات: Next.js 15، TypeScript، PostgreSQL، Prisma، Tailwind CSS
- الحالة: الموقع مكتمل (لوحة المدير، لوحة المعلم، منصة الطالب). تطبيق الجوال هو المرحلة التالية.

## التشغيل محلياً

المتطلبات: Node.js 22 وPostgreSQL 16.

```bash
cp .env.example .env          # عدّل DATABASE_URL إن لزم
npm install
npx prisma db push            # إنشاء الجداول
npm run db:seed               # الأدوار + أول مدير + بيانات تجريبية
npm run dev                   # http://localhost:3000
```

**حسابات تجريبية** (تُنشأ بالبيانات التجريبية):

| الحساب | الدخول | كلمة المرور |
|---|---|---|
| مدير النظام | قيمة `SEED_ADMIN_EMAIL` | قيمة `SEED_ADMIN_PASSWORD` |
| معلم | teacher1@example.com | password123 |
| طالب | 07801111111 | password123 |

لمنع إنشاء البيانات التجريبية: `SEED_DEMO=0 npm run db:seed`.

## النشر بـ Docker

```bash
DB_PASSWORD=كلمة-سر-قوية CRON_SECRET=سر-عشوائي docker compose up -d --build
```

ثم افتح `/setup` لإنشاء حساب مدير النظام الأول. هذه الصفحة تعمل مرة واحدة فقط، حين لا يوجد أي مدير.

**المهمة اليومية لحالة المعلمين** (إيقاف المعلم بعد انتهاء مهلة السماح للفاتورة): اضبط مهمة مجدولة (cron) تستدعي:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/teacher-status
```

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل بيئة التطوير |
| `npm run build` / `npm start` | بناء وتشغيل نسخة الإنتاج |
| `npm run typecheck` | فحص الأنواع |
| `npm test` | الاختبارات |
| `npm run db:seed` | تهيئة البيانات |
