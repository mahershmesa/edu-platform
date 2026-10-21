"use client";

import { cloneElement, isValidElement, useState } from "react";
import { ActionForm, SubmitButton, type ServerAction } from "./action-form";
import { Button } from "./button";
import { Dialog } from "./dialog";

/**
 * A trigger element that opens a dialog containing a server-action form.
 * The dialog closes and the page refreshes when the action returns ok.
 */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "حفظ",
  size = "md",
  children,
}: {
  trigger: React.ReactElement<{ onClick?: () => void }>;
  title: string;
  description?: string;
  action: ServerAction;
  submitLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      {isValidElement(trigger) ? cloneElement(trigger, { onClick: () => setOpen(true) }) : trigger}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setKey((k) => k + 1); // fresh form next time
        }}
        title={title}
        description={description}
        size={size}
      >
        <ActionForm key={key} action={action} onSuccess={() => setOpen(false)} className="space-y-4">
          {children}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
