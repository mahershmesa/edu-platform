"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextField } from "@/components/ui/field";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [show, setShow] = useState(false);
  return (
    <ActionForm action={loginAction} className="space-y-4" showSuccessToast={false}>
      <input type="hidden" name="next" value={next} />
      <TextField name="identifier" label="رقم الهاتف أو البريد الإلكتروني" placeholder="07XXXXXXXXX" autoComplete="username" dir="ltr" className="[&_input]:text-right" />
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            كلمة المرور
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-brand-700 hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </div>
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" className="input pl-10" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <SubmitButton className="h-12 w-full text-base" pendingText="جارٍ الدخول...">
        تسجيل الدخول
      </SubmitButton>
    </ActionForm>
  );
}
