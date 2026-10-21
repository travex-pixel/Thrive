import { describe, expect, it } from "vitest";
import { suggestCategory } from "@/lib/pack/suggest";

describe("suggestCategory", () => {
  it.each([
    ["CBA statement Mar 2024.pdf", "pdf", "financial"],
    ["Joint account transactions.pdf", "pdf", "financial"],
    ["Westpac_eStatement_2025-06.pdf", "pdf", "financial"],
    ["Lease agreement 2023.pdf", "pdf", "household"],
    ["AGL electricity bill.pdf", "pdf", "household"],
    ["Scanned bills 2024.pdf", "pdf", "household"],
    ["Passport - Alex.pdf", "pdf", "identity"],
    ["birth certificate.jpg", "image", "identity"],
    ["Form 888 - Jordan.pdf", "pdf", "forms"],
    ["Relationship statement.docx", "passthrough", "forms"],
    ["WhatsApp chat export.pdf", "pdf", "commitment"],
    ["Flight itinerary Bali.pdf", "pdf", "commitment"],
    ["Wedding photos.pdf", "pdf", "social"],
    ["IMG_4821.HEIC", "image", "social"],
    ["PXL_20240101_101010.jpg", "image", "social"],
    ["WhatsApp Image 2024-01-01 at 10.10.10.jpeg", "image", "social"],
  ] as const)("%s -> %s", (name, kind, expected) => {
    expect(suggestCategory(name, kind)).toBe(expected);
  });

  it.each([["Screenshot 2024-03-01 at 9.41.22 am.png"], ["scan0001.pdf"], ["document.pdf"]])(
    "leaves ambiguous %s unsorted",
    (name) => {
      expect(suggestCategory(name, "pdf")).toBeNull();
    },
  );

  it("never suggests for unsupported files", () => {
    expect(suggestCategory("bank statement.zip", "unsupported")).toBeNull();
  });

  it("does not mistake words inside other words", () => {
    expect(suggestCategory("Kingston rates.pdf", "pdf")).toBe("household"); // 'rates', not 'ing'
    expect(suggestCategory("Billabong trip.pdf", "pdf")).toBeNull(); // no 'bill' match inside 'Billabong'
  });
});
