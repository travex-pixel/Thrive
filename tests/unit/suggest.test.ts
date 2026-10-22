import { describe, expect, it } from "vitest";
import { detectDocType } from "@/lib/pack/suggest";

describe("detectDocType", () => {
  it.each([
    ["CBA statement Mar 2024.pdf", "pdf", "money"],
    ["Joint account transactions.pdf", "pdf", "money"],
    ["Westpac_eStatement_2025-06.pdf", "pdf", "money"],
    ["Statement of account 2024.pdf", "pdf", "money"],
    ["Payslip (password).pdf", "pdf", "money"],
    ["Bank statement from CBA.pdf", "pdf", "money"],
    ["Lease agreement 2023.pdf", "pdf", "home"],
    ["Mail addressed to us.jpg", "image", "home"],
    ["AGL electricity bill.pdf", "pdf", "bill"],
    ["Scanned bills 2024.pdf", "pdf", "bill"],
    ["Kingston rates.pdf", "pdf", "bill"],
    ["Health insurance - Bupa.pdf", "pdf", "bill"],
    ["Passport - Alex.pdf", "pdf", "id"],
    ["birth certificate.jpg", "image", "id"],
    ["Form 888 - Jordan.pdf", "pdf", "form"],
    ["Stat dec - Sam.pdf", "pdf", "form"],
    ["Relationship statement.docx", "passthrough", "letter"],
    ["Witness statement from Jane.pdf", "pdf", "letter"],
    ["Supporting statement - Mum.pdf", "pdf", "letter"],
    ["Statement from John Smith.pdf", "pdf", "letter"],
    ["Letter from Mum about our relationship.pdf", "pdf", "letter"],
    ["Power of attorney.pdf", "pdf", "legal"],
    ["Our wills 2024.pdf", "pdf", "legal"],
    ["WhatsApp chat export.pdf", "pdf", "chat"],
    ["Call log March.png", "image", "chat"],
    ["Flight itinerary Bali.pdf", "pdf", "travel"],
    ["Billabong trip.pdf", "pdf", "travel"],
    ["Wedding photos.pdf", "pdf", "photo"],
    ["IMG_4821.HEIC", "image", "photo"],
    ["PXL_20240101_101010.jpg", "image", "photo"],
    ["WhatsApp Image 2024-01-01 at 10.10.10.jpeg", "image", "photo"],
    ["Holiday Bali.webp", "image", "photo"],
    // A photo of a trip is a photo, not a booking.
    ["Trip to Bali.jpg", "image", "photo"],
    ["Water park.jpg", "image", "photo"],
  ] as const)("%s -> %s", (name, kind, expected) => {
    expect(detectDocType(name, kind)).toBe(expected);
  });

  it.each([
    ["Screenshot 2024-03-01 at 9.41.22 am.png", "image"],
    ["IMG_1234.PNG", "image"], // an iPhone screenshot: could show anything
    ["Scan 0001.jpg", "image"],
    ["scan0001.pdf", "pdf"],
    ["document.pdf", "pdf"],
    // "Statement" alone could be a bank statement or a written one, so it isn't guessed.
    ["Statement 2024-03.pdf", "pdf"],
  ] as const)("leaves ambiguous %s unlabelled", (name, kind) => {
    expect(detectDocType(name, kind)).toBeNull();
  });

  it("never labels unsupported files", () => {
    expect(detectDocType("bank statement.zip", "unsupported")).toBeNull();
  });

  it("does not mistake words inside other words", () => {
    expect(detectDocType("Billabong.pdf", "pdf")).toBeNull(); // no 'bill' inside 'Billabong'
    expect(detectDocType("Kingston.pdf", "pdf")).toBeNull(); // no 'ing' inside 'Kingston'
    expect(detectDocType("Letterbox.pdf", "pdf")).toBeNull();
  });

  it("does not treat the name Will as a will", () => {
    expect(detectDocType("Dinner with Will.jpg", "image")).toBe("photo");
    expect(detectDocType("Will.pdf", "pdf")).toBe("legal");
  });
});
