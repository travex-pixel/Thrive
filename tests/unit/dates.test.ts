import { describe, expect, it } from "vitest";
import {
  dateSortKey,
  formatDate,
  formatDateRange,
  normaliseDateInput,
  parseDateFromFileName,
} from "@/lib/pack/dates";

const NOW = new Date("2026-10-21T00:00:00Z");
const parse = (name: string) => parseDateFromFileName(name, NOW);

describe("parseDateFromFileName", () => {
  it.each([
    ["IMG_20240315_101500.jpg", "2024-03-15"],
    ["PXL_20250102_093000123.jpg", "2025-01-02"],
    ["Screenshot 2024-03-15 at 10.22.33 am.png", "2024-03-15"],
    ["WhatsApp Image 2023-11-04 at 18.01.12.jpeg", "2023-11-04"],
    ["statement_2024.06.30.pdf", "2024-06-30"],
    ["Lease 31-03-2024.pdf", "2024-03-31"],
    ["rates notice 5.7.2025.pdf", "2025-07-05"],
    ["CBA March 2024.pdf", "2024-03"],
    ["joint-account-Mar_2024.pdf", "2024-03"],
    ["Wedding invite 15 March 2025.pdf", "2025-03-15"],
    ["Electricity bill Sept 2025.pdf", "2025-09"],
    ["lease 2023-07.pdf", "2023-07"],
    ["bill 07-2023.pdf", "2023-07"],
  ])("%s -> %s", (name, expected) => {
    expect(parse(name)).toBe(expected);
  });

  it.each([
    ["IMG_1234.HEIC"],
    ["passport.pdf"],
    ["invoice 98765.pdf"],
    ["photo 2099-01-01.jpg"], // future
    ["scan 2024-02-30.pdf"], // invalid day, no fallback that fits
    ["mayday plan.pdf"],
  ])("%s -> null", (name) => {
    expect(parse(name)).toBeNull();
  });

  it("reads 03-04-2024 day-first (Australian)", () => {
    expect(parse("bill 03-04-2024.pdf")).toBe("2024-04-03");
  });
});

describe("normaliseDateInput", () => {
  it("accepts day, month and year precision", () => {
    expect(normaliseDateInput("2024-3-5")).toBe("2024-03-05");
    expect(normaliseDateInput("2024-03")).toBe("2024-03");
    expect(normaliseDateInput("2024")).toBe("2024");
  });
  it("rejects impossible or empty values", () => {
    expect(normaliseDateInput("2024-02-31")).toBeNull();
    expect(normaliseDateInput("2024-13")).toBeNull();
    expect(normaliseDateInput("")).toBeNull();
    expect(normaliseDateInput("March")).toBeNull();
  });
});

describe("formatting and sorting", () => {
  it("formats each precision", () => {
    expect(formatDate("2024-03-15")).toBe("15 Mar 2024");
    expect(formatDate("2024-03")).toBe("Mar 2024");
    expect(formatDate("2024")).toBe("2024");
    expect(formatDate(null)).toBe("No date");
  });
  it("sorts month-only before days in that month and undated last", () => {
    const keys = ["2024-03-02", null, "2024-03", "2023"].map(dateSortKey).sort();
    expect(keys).toEqual(["2023-00-00", "2024-03-00", "2024-03-02", "9999-99-99"]);
  });
  it("formats ranges", () => {
    expect(formatDateRange(["2024-03-02", "2023-01", null, "2026-09-30"])).toBe("Jan 2023 – Sep 2026");
    expect(formatDateRange(["2024-03-02", "2024-03-20"])).toBe("Mar 2024");
    expect(formatDateRange([null])).toBe("");
  });
});
