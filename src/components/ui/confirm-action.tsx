"use client";

import { useState } from "react";
import { ActionForm, SubmitButton, type ServerAction } from "./action-form";
import { Button } from "./button";
import { Dialog } from "./dialog";

/** Button that asks for confirmation, then runs a server action. */
export function ConfirmAction({
  trigger,
  title,
  message,
  action,
  confirmLabel = "تأكيد",
  danger = true,
}: {
  trigger: React.ReactElement<{ onClick?: () => void }>;
  title: string;
  message: React.ReactNode;
  action: ServerAction;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const Trigger = trigger;
  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {Trigger}
      </span>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setKey((k) => k + 1);
        }}
        title={title}
        size="sm"
      >
        <ActionForm key={key} action={action} onSuccess={() => setOpen(false)}>
          <div className="text-sm leading-7 text-muted">{message}</div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton variant={danger ? "dangerSolid" : "primary"} pendingText="جارٍ التنفيذ...">
              {confirmLabel}
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
