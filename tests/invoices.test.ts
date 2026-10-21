import { describe, expect, it } from "vitest";
import { blocksTeacher, invoiceNumber, invoiceView, shouldBillingSuspend, INVOICE_LABELS } from "@/lib/domain/invoices";

const at = (s: string) => new Date(s);

describe("invoiceView", () => {
  const now = at("2026-03-15T10:00:00");
  it("DUE before the due date", () => expect(invoiceView({ status: "DUE", dueDate: at("2026-03-20T00:00:00") }, now)).toBe("DUE"));
  it("DUE on the due date itself", () => expect(invoiceView({ status: "DUE", dueDate: at("2026-03-15T00:00:00") }, now)).toBe("DUE"));
  it("OVERDUE the day after", () => expect(invoiceView({ status: "DUE", dueDate: at("2026-03-14T00:00:00") }, now)).toBe("OVERDUE"));
  it("non-DUE statuses pass through", () => {
    for (const s of ["DRAFT", "PAID", "CANCELLED"] as const) expect(invoiceView({ status: s, dueDate: at("2020-01-01") }, now)).toBe(s);
  });
  it("labels every view in Arabic", () => {
    for (const v of ["DRAFT", "DUE", "OVERDUE", "PAID", "CANCELLED"] as const) expect(INVOICE_LABELS[v]).toMatch(/[؀-ۿ]/);
  });
});

describe("blocksTeacher (grace period)", () => {
  const due = at("2026-03-10T00:00:00");
  const inv = { status: "DUE" as const, dueDate: due, amount: 100000 };
  it("does not block within the grace days", () => expect(blocksTeacher(inv, 7, at("2026-03-17T23:00:00"))).toBe(false));
  it("does not block exactly at the grace boundary day", () => expect(blocksTeacher(inv, 7, at("2026-03-17T00:00:00"))).toBe(false));
  it("blocks the day after grace ends", () => expect(blocksTeacher(inv, 7, at("2026-03-18T08:00:00"))).toBe(true));
  it("zero grace blocks the day after due", () => {
    expect(blocksTeacher(inv, 0, at("2026-03-10T20:00:00"))).toBe(false);
    expect(blocksTeacher(inv, 0, at("2026-03-11T01:00:00"))).toBe(true);
  });
  it("free invoices never block", () => expect(blocksTeacher({ ...inv, amount: 0 }, 0, at("2030-01-01"))).toBe(false));
  it("paid, draft and cancelled never block", () => {
    for (const s of ["PAID", "DRAFT", "CANCELLED"] as const) expect(blocksTeacher({ ...inv, status: s }, 0, at("2030-01-01"))).toBe(false);
  });
});

describe("shouldBillingSuspend", () => {
  const now = at("2026-06-01T12:00:00");
  it("false with no invoices", () => expect(shouldBillingSuspend([], 7, now)).toBe(false));
  it("true if any invoice blocks", () =>
    expect(
      shouldBillingSuspend(
        [
          { status: "PAID", dueDate: at("2026-01-01"), amount: 5 },
          { status: "DUE", dueDate: at("2026-05-01"), amount: 5 },
        ],
        7,
        now,
      ),
    ).toBe(true));
  it("false when overdue but still in grace", () => expect(shouldBillingSuspend([{ status: "DUE", dueDate: at("2026-05-28"), amount: 5 }], 7, now)).toBe(false));
});

describe("invoiceNumber", () => {
  it("pads the sequence with the year", () => expect(invoiceNumber(7, at("2026-02-01"))).toBe("INV-2026-00007"));
});
