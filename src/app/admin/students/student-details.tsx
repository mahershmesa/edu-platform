"use client";

import { useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/** Opens a dialog with server-rendered content (devices / enrollments). */
export function DetailsDialog({
  title,
  label,
  icon = "devices",
  children,
}: {
  title: string;
  label: string;
  icon?: "devices" | "none";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {icon === "devices" ? (
        <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={() => setOpen(true)}>
          <MonitorSmartphone className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Dialog>
    </>
  );
}
