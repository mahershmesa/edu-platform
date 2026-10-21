import { INVOICE_LABELS, type InvoiceView } from "@/lib/domain/invoices";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const TONES: Record<InvoiceView, BadgeTone> = {
  DRAFT: "gray",
  DUE: "blue",
  OVERDUE: "red",
  PAID: "green",
  CANCELLED: "gray",
};

export function InvoiceStatusBadge({ view }: { view: InvoiceView }) {
  return <Badge tone={TONES[view]}>{INVOICE_LABELS[view]}</Badge>;
}
