// كتالوج الصلاحيات: المصدر الوحيد لأسماء الصلاحيات وتسمياتها العربية.

export const PERMISSION_GROUPS = [
  { key: "dashboard", label: "لوحة التحكم", perms: [["dashboard.view", "عرض لوحة التحكم"]] },
  {
    key: "teachers",
    label: "المعلمون",
    perms: [
      ["teachers.read", "عرض المعلمين"],
      ["teachers.write", "إنشاء/تعديل المعلمين"],
      ["teachers.delete", "حذف المعلمين"],
    ],
  },
  { key: "impersonation", label: "الدخول بصفة معلم", perms: [["teachers.impersonate", "الدخول بصفة معلم"]] },
  {
    key: "students",
    label: "الطلاب",
    perms: [
      ["students.read", "عرض الطلاب"],
      ["students.write", "تعديل الطلاب"],
      ["students.change_password", "تغيير كلمة مرور الطلاب"],
      ["students.reset_devices", "إعادة تعيين أجهزة الطلاب"],
    ],
  },
  {
    key: "enrollments",
    label: "الطلاب المشتركون",
    perms: [
      ["enrollments.read", "عرض الاشتراكات"],
      ["enrollments.write", "إلغاء الاشتراكات"],
    ],
  },
  {
    key: "courses",
    label: "الدورات",
    perms: [
      ["courses.read", "عرض الدورات"],
      ["courses.write", "إنشاء/تعديل الدورات"],
      ["courses.delete", "حذف الدورات"],
    ],
  },
  {
    key: "categories",
    label: "الفئات",
    perms: [
      ["categories.read", "عرض الفئات"],
      ["categories.write", "إنشاء/تعديل الفئات"],
      ["categories.delete", "حذف الفئات"],
    ],
  },
  {
    key: "codes",
    label: "الأكواد",
    perms: [
      ["codes.read", "عرض الأكواد"],
      ["codes.write", "إنشاء/تعديل الأكواد"],
      ["codes.delete", "حذف/تعطيل الأكواد"],
    ],
  },
  {
    key: "bills",
    label: "فواتير المعلمين",
    perms: [
      ["bills.read", "عرض الفواتير"],
      ["bills.write", "إنشاء/تعديل الفواتير"],
    ],
  },
  {
    key: "teacher_status",
    label: "حالة المعلمين",
    perms: [
      ["teacher_status.read", "عرض حالة المعلمين"],
      ["teacher_status.write", "تحديث حالة المعلمين"],
    ],
  },
  {
    key: "ads",
    label: "الإعلانات",
    perms: [
      ["ads.read", "عرض الإعلانات"],
      ["ads.write", "إنشاء/تعديل الإعلانات"],
      ["ads.delete", "حذف الإعلانات"],
    ],
  },
  {
    key: "app",
    label: "إعدادات التطبيق",
    perms: [
      ["app.read", "عرض إعدادات التطبيق"],
      ["app.write", "تعديل إعدادات التطبيق"],
    ],
  },
  {
    key: "settings",
    label: "الإعدادات العامة",
    perms: [
      ["settings.read", "عرض الإعدادات"],
      ["settings.write", "تعديل الإعدادات"],
    ],
  },
  {
    key: "staff",
    label: "الموظفون",
    perms: [
      ["staff.read", "عرض الموظفين"],
      ["staff.write", "إنشاء/تعديل الموظفين"],
    ],
  },
  {
    key: "roles",
    label: "الأدوار",
    perms: [
      ["roles.read", "عرض الأدوار"],
      ["roles.write", "إنشاء/تعديل الأدوار"],
      ["roles.delete", "حذف الأدوار"],
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["perms"][number][0];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p[0]));

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => [p[0], p[1]])),
);

/** Role management is reserved for the system admin; full-admin gets everything else. */
const ROLE_PERMS = ALL_PERMISSIONS.filter((p) => p.startsWith("roles."));

export const SYSTEM_ROLES: { slug: string; name: string; description: string; permissions: Permission[] }[] = [
  {
    slug: "support",
    name: "الدعم",
    description: "الطلاب والأكواد والدعم",
    permissions: [
      "dashboard.view",
      "students.read",
      "students.write",
      "students.change_password",
      "students.reset_devices",
      "enrollments.read",
      "codes.read",
    ],
  },
  {
    slug: "finance",
    name: "المالية",
    description: "فواتير واشتراكات وحالة المعلمين",
    permissions: [
      "dashboard.view",
      "teachers.read",
      "bills.read",
      "bills.write",
      "teacher_status.read",
      "teacher_status.write",
      "codes.read",
      "enrollments.read",
    ],
  },
  {
    slug: "content",
    name: "المحتوى",
    description: "الدورات والفئات والإعلانات",
    permissions: [
      "dashboard.view",
      "teachers.read",
      "courses.read",
      "courses.write",
      "courses.delete",
      "categories.read",
      "categories.write",
      "categories.delete",
      "ads.read",
      "ads.write",
      "ads.delete",
      "teachers.impersonate",
    ],
  },
  {
    slug: "full-admin",
    name: "مدير كامل",
    description: "كل صلاحيات لوحة الإدارة عدا إدارة الأدوار",
    permissions: ALL_PERMISSIONS.filter((p) => !ROLE_PERMS.includes(p)),
  },
];
