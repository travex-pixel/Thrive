import { describe, expect, it } from "vitest";
import { CONTENT_BUDGET_BYTES, estimateItemBytes, partitionItems, planPack, sortItems } from "@/lib/pack/plan";
import { safeFileNamePart, titleFromFileName } from "@/lib/pack/naming";
import type { EvidenceItem } from "@/lib/pack/types";

let seq = 0;
function item(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  seq++;
  return {
    id: `item-${seq}`,
    fileName: `file-${seq}.pdf`,
    mimeType: "application/pdf",
    size: 200_000,
    kind: "pdf",
    category: "financial",
    title: `File ${seq}`,
    date: null,
    dateSource: null,
    addedAt: seq,
    pageCount: 2,
    ...overrides,
  };
}

const settings = { attachmentLimit: 60, includeIndex: true };

describe("naming", () => {
  it("derives readable titles", () => {
    expect(titleFromFileName("joint_bank-statement_Mar 2024.pdf")).toBe("joint bank statement Mar 2024");
    expect(titleFromFileName(".pdf")).toBe("Untitled");
  });
  it("makes file-name-safe ASCII", () => {
    expect(safeFileNamePart("Zoë’s passport / scan #2")).toBe("Zoe s passport scan 2");
    expect(safeFileNamePart("你好")).toBe("File");
  });
});

describe("sortItems", () => {
  it("orders by date, undated last, stable by added order", () => {
    const a = item({ date: "2024-05" });
    const b = item({ date: null });
    const c = item({ date: "2023-01-10" });
    const d = item({ date: null });
    expect(sortItems([a, b, c, d]).map((i) => i.id)).toEqual([c.id, a.id, b.id, d.id]);
  });
});

describe("partitionItems", () => {
  it("keeps everything in one file when it fits", () => {
    const parts = partitionItems([item(), item(), item()]);
    expect(parts).toHaveLength(1);
    expect(parts[0].items).toHaveLength(3);
  });

  it("splits into multiple files under the budget, preserving order", () => {
    const items = Array.from({ length: 10 }, () => item({ size: 1_000_000 }));
    const parts = partitionItems(items);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.bytes).toBeLessThanOrEqual(CONTENT_BUDGET_BYTES);
    expect(parts.flatMap((p) => p.items.map((i) => i.id))).toEqual(items.map((i) => i.id));
  });

  it("isolates an oversized item and counts the parts it needs", () => {
    const big = item({ size: 12_000_000, pageCount: 40 });
    const parts = partitionItems([item(), big, item()]);
    const bigPart = parts.find((p) => p.items.includes(big))!;
    expect(bigPart.items).toEqual([big]);
    expect(bigPart.parts).toBe(Math.ceil(12_000_000 / CONTENT_BUDGET_BYTES));
  });
});

describe("estimateItemBytes", () => {
  it("assumes locked PDFs are re-rendered per page", () => {
    expect(estimateItemBytes(item({ encrypted: true, pageCount: 4 }))).toBe(4 * 260_000);
  });
  it("assumes images shrink but never to nothing", () => {
    expect(estimateItemBytes(item({ kind: "image", fileName: "a.jpg", size: 4_000_000 }))).toBe(900_000);
    expect(estimateItemBytes(item({ kind: "image", fileName: "a.jpg", size: 50_000 }))).toBe(120_000);
  });
});

describe("planPack", () => {
  it("numbers outputs in upload order with the index first", () => {
    const plan = planPack(
      [
        item({ category: "social", kind: "image", fileName: "a.jpg" }),
        item({ category: "financial" }),
        item({ category: "identity", title: "Passport — Alex" }),
        item({ category: "forms", kind: "passthrough", fileName: "statement.docx", title: "Relationship statement" }),
      ],
      settings,
    );
    expect(plan.docs.map((d) => d.fileName)).toEqual([
      "00 Evidence index.pdf",
      "01 Financial evidence.pdf",
      "02 Social evidence.pdf",
      "03 Identity - Passport Alex.pdf",
      "04 Forms & statements - Relationship statement.docx",
    ]);
    expect(plan.attachmentCount).toBe(5);
    expect(plan.overLimit).toBe(false);
  });

  it("routes unsorted files into Other and warns", () => {
    const plan = planPack([item({ category: "unsorted" })], settings);
    expect(plan.docs.map((d) => d.fileName)).toContain("01 Other evidence.pdf");
    expect(plan.unsortedCount).toBe(1);
    expect(plan.warnings.join(" ")).toMatch(/unsorted/);
  });

  it("leaves out unusable files and warns", () => {
    const plan = planPack([item(), item({ kind: "unsupported", error: "Unsupported" })], settings);
    expect(plan.usableItemCount).toBe(1);
    expect(plan.warnings.join(" ")).toMatch(/can’t be used/);
  });

  it("flags when attachments exceed the limit", () => {
    const many = Array.from({ length: 5 }, () => item({ category: "identity" }));
    const plan = planPack(many, { attachmentLimit: 3, includeIndex: false });
    expect(plan.attachmentCount).toBe(5);
    expect(plan.overLimit).toBe(true);
  });

  it("labels split parts", () => {
    const items = Array.from({ length: 12 }, () => item({ size: 1_000_000 }));
    const plan = planPack(items, { attachmentLimit: 60, includeIndex: false });
    const names = plan.docs.map((d) => d.fileName);
    expect(names[0]).toMatch(/^01 Financial evidence \(part 1 of \d\)\.pdf$/);
    expect(new Set(names).size).toBe(names.length);
  });

  it("returns an empty plan when nothing is usable", () => {
    const plan = planPack([], settings);
    expect(plan.docs).toHaveLength(0);
    expect(plan.attachmentCount).toBe(0);
  });
});
