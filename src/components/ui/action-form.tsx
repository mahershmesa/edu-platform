"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { Alert } from "./alert";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { FormStateContext } from "./form-context";
import { useToast } from "./toast";

export type ServerAction = (prev: ActionState, form: FormData) => Promise<ActionState>;

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingText = "جارٍ الحفظ...",
  size,
}: {
  children: React.ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Form bound to a server action. Shows the error summary, passes field errors to fields
 * through context, toasts the success message and refreshes the page data.
 */
export function ActionForm({
  action,
  children,
  onSuccess,
  resetOnSuccess = false,
  className,
  showSuccessToast = true,
}: {
  action: ServerAction;
  children: React.ReactNode;
  onSuccess?: (state: ActionState) => void;
  resetOnSuccess?: boolean;
  className?: string;
  showSuccessToast?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state === lastHandled.current || !state.ok) return;
    lastHandled.current = state;
    if (showSuccessToast) toast(state.message ?? "تم الحفظ بنجاح");
    if (resetOnSuccess) formRef.current?.reset();
    router.refresh();
    onSuccess?.(state);
  }, [state, toast, router, onSuccess, resetOnSuccess, showSuccessToast]);

  return (
    <FormStateContext.Provider value={state}>
      <form ref={formRef} action={formAction} className={className} autoComplete="off" noValidate>
        {state.error && (
          <Alert tone="error" className="mb-4">
            {state.error}
          </Alert>
        )}
        {children}
      </form>
    </FormStateContext.Provider>
  );
}
