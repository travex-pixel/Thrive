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

const settings = { attachmentLimit: 60, includeIndex: true, compactPhotos: false, startNumber: 1 };

describe("naming", () => {
  it("derives readable titles", () => {
    expect(titleFromFileName("joint_bank-statement_Mar 2024.pdf")).toBe("joint bank statement Mar 2024");
    expect(titleFromFileName(".pdf")).toBe("Untitled");
  });
  it("makes file-name-safe ASCII with underscores only", () => {
    expect(safeFileNamePart("Zoë’s passport / scan #2")).toBe("Zoe_s_passport_scan_2");
    expect(safeFileNamePart("Forms & statements (2024)")).toBe("Forms_statements_2024");
    expect(safeFileNamePart("你好")).toBe("");
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
    expect(estimateItemBytes(item({ kind: "image", fileName: "a.jpg", size: 3_000_000 }))).toBe(450_000);
    expect(estimateItemBytes(item({ kind: "image", fileName: "a.jpg", size: 9_000_000 }))).toBe(600_000);
    expect(estimateItemBytes(item({ kind: "image", fileName: "a.jpg", size: 50_000 }))).toBe(120_000);
  });
  it("halves photo estimates with smaller photos", () => {
    expect(estimateItemBytes(item({ kind: "image", fileName: "a.jpg", size: 3_000_000 }), true)).toBe(225_000);
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
      "00_Evidence_index.pdf",
      "01_Financial_evidence.pdf",
      "02_Social_evidence.pdf",
      "03_Identity_Passport_Alex.pdf",
      "04_Forms_and_statements_Relationship_statement.docx",
    ]);
    for (const doc of plan.docs) expect(doc.fileName).toMatch(/^[A-Za-z0-9_]+\.[a-z]+$/);
    expect(plan.attachmentCount).toBe(5);
    expect(plan.overLimit).toBe(false);
  });

  it("routes unsorted files into Other and warns", () => {
    const plan = planPack([item({ category: "unsorted" })], settings);
    expect(plan.docs.map((d) => d.fileName)).toContain("01_Other_evidence.pdf");
    expect(plan.unsortedCount).toBe(1);
    expect(plan.warnings.join(" ")).toMatch(/into “Other”/);
  });

  it("leaves out unusable files and warns", () => {
    const plan = planPack([item(), item({ kind: "unsupported", error: "Unsupported" })], settings);
    expect(plan.usableItemCount).toBe(1);
    expect(plan.warnings.join(" ")).toMatch(/can’t be used/);
  });

  it("flags when attachments exceed the limit", () => {
    const many = Array.from({ length: 5 }, () => item({ category: "identity" }));
    const plan = planPack(many, { ...settings, attachmentLimit: 3, includeIndex: false });
    expect(plan.attachmentCount).toBe(5);
    expect(plan.overLimit).toBe(true);
    expect(plan.warnings.join(" ")).toMatch(/has 5 files and your limit is set to 3/);
    // Mechanical options only: no advice about where documents belong.
    expect(plan.warnings.join(" ")).not.toMatch(/merged group|separate files into/);
  });

  it("labels split parts", () => {
    const items = Array.from({ length: 12 }, () => item({ size: 1_000_000 }));
    const plan = planPack(items, { ...settings, includeIndex: false });
    const names = plan.docs.map((d) => d.fileName);
    expect(names[0]).toMatch(/^01_Financial_evidence_part1of\d\.pdf$/);
    expect(new Set(names).size).toBe(names.length);
  });

  it("continues numbering after files already uploaded", () => {
    const plan = planPack([item(), item({ category: "identity", title: "Passport" })], { ...settings, startNumber: 24 });
    expect(plan.docs.map((d) => d.fileName)).toEqual([
      "24_Evidence_index.pdf",
      "25_Financial_evidence.pdf",
      "26_Identity_Passport.pdf",
    ]);
    const noIndex = planPack([item()], { ...settings, startNumber: 24, includeIndex: false });
    expect(noIndex.docs.map((d) => d.fileName)).toEqual(["24_Financial_evidence.pdf"]);
  });

  it("falls back to a generic name when a title has no Latin letters", () => {
    const plan = planPack([item({ category: "identity", title: "护照" })], { ...settings, includeIndex: false });
    expect(plan.docs[0].fileName).toBe("01_Identity_Document.pdf");
    expect(plan.warnings.join(" ")).toMatch(/can’t print/);
  });

  it("counts automatic dates that haven't been checked", () => {
    const plan = planPack(
      [
        item({ date: "2024-03-15", dateSource: "exif" }),
        item({ date: "2024-03", dateSource: "filename" }),
        item({ date: "2024-01-02", dateSource: "user" }),
        item({ date: null, dateSource: null }),
      ],
      settings,
    );
    expect(plan.uncheckedDateCount).toBe(2);
  });

  it("returns an empty plan when nothing is usable", () => {
    const plan = planPack([], settings);
    expect(plan.docs).toHaveLength(0);
    expect(plan.attachmentCount).toBe(0);
  });
});
