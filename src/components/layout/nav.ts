import type { Permission } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: string; perm?: Permission; systemAdminOnly?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  { label: "الرئيسية", items: [{ href: "/admin", label: "لوحة التحكم", icon: "dashboard", perm: "dashboard.view" }] },
  {
    label: "المستخدمون",
    items: [
      { href: "/admin/teachers", label: "المعلمون", icon: "teachers", perm: "teachers.read" },
      { href: "/admin/students", label: "الطلاب", icon: "students", perm: "students.read" },
      { href: "/admin/enrollments", label: "الطلاب المشتركون", icon: "enrollments", perm: "enrollments.read" },
    ],
  },
  {
    label: "المحتوى",
    items: [
      { href: "/admin/courses", label: "الدورات", icon: "courses", perm: "courses.read" },
      { href: "/admin/categories", label: "الفئات", icon: "categories", perm: "categories.read" },
      { href: "/admin/banners", label: "الإعلانات", icon: "banners", perm: "ads.read" },
    ],
  },
  {
    label: "المالية والأنظمة",
    items: [
      { href: "/admin/invoices", label: "فواتير المعلمين", icon: "invoices", perm: "bills.read" },
      { href: "/admin/teacher-status", label: "حالة المعلمين", icon: "status", perm: "teacher_status.read" },
      { href: "/admin/codes", label: "الأكواد", icon: "codes", perm: "codes.read" },
      { href: "/admin/app", label: "إعدادات التطبيق", icon: "app", perm: "app.read" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { href: "/admin/staff", label: "الموظفون", icon: "staff", perm: "staff.read" },
      { href: "/admin/roles", label: "الأدوار والصلاحيات", icon: "roles", systemAdminOnly: true },
      { href: "/admin/audit", label: "سجل العمليات", icon: "audit", systemAdminOnly: true },
      { href: "/admin/settings", label: "الإعدادات", icon: "settings", perm: "settings.read" },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  { label: "الرئيسية", items: [{ href: "/teacher", label: "لوحة التحكم", icon: "dashboard" }] },
  {
    label: "المحتوى",
    items: [
      { href: "/teacher/courses", label: "الدورات", icon: "courses" },
      { href: "/teacher/lessons", label: "الدروس", icon: "lessons" },
      { href: "/teacher/exams", label: "الامتحانات", icon: "exams" },
      { href: "/teacher/media", label: "مكتبة الوسائط", icon: "media" },
    ],
  },
  {
    label: "الطلاب والمبيعات",
    items: [
      { href: "/teacher/students", label: "الطلاب", icon: "students" },
      { href: "/teacher/codes", label: "الأكواد", icon: "codes" },
      { href: "/teacher/invoices", label: "الفواتير", icon: "invoices" },
    ],
  },
  { label: "الحساب", items: [{ href: "/teacher/profile", label: "الملف الشخصي", icon: "profile" }] },
];
