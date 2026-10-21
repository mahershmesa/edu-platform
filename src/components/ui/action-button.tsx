"use client";

import { ActionForm, SubmitButton, type ServerAction } from "./action-form";
import type { ButtonSize, ButtonVariant } from "./button";

/** One-click server action button (no confirmation). */
export function ActionButton({
  action,
  children,
  variant = "secondary",
  className,
  size = "sm",
}: {
  size?: ButtonSize;
  action: ServerAction;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <ActionForm action={action} className="inline">
      <SubmitButton variant={variant} size={size} className={className} pendingText="...">
        {children}
      </SubmitButton>
    </ActionForm>
  );
}
