import { describe, expect, it } from "vitest";
import { createItem } from "@/lib/pack/inspect";

const file = (name: string, type = "", size = 1000) => new File([new Uint8Array(size)], name, { type });

describe("createItem", () => {
  it("never puts a file in a group by itself, only labels its type", () => {
    const item = createItem(file("CBA statement March 2025.pdf", "application/pdf"), 1);
    expect(item.category).toBe("unsorted");
    expect(item.docType).toBe("money");
  });

  it("treats a file-name date as a suggestion, not a fact", () => {
    const item = createItem(file("Lease 31-03-2024.pdf", "application/pdf"), 1);
    expect(item.date).toBe("2024-03-31");
    expect(item.dateSource).toBe("filename");
  });

  it.each([
    ["IMG-20250901-WA0003.jpg", "image/jpeg"], // WhatsApp: the day it was saved, not taken
    ["WhatsApp Image 2023-11-04 at 18.01.12.jpeg", "image/jpeg"],
    ["Screenshot 2024-03-15 at 10.22.33 am.png", "image/png"], // the day the screenshot was taken
  ])("ignores the save date in %s", (name, type) => {
    const item = createItem(file(name, type), 1);
    expect(item.date).toBeNull();
    expect(item.dateSource).toBeNull();
  });

  it("marks what still needs a background check", () => {
    expect(createItem(file("a.pdf", "application/pdf"), 1).inspected).toBe(false);
    expect(createItem(file("a.jpg", "image/jpeg"), 1).inspected).toBe(false);
    expect(createItem(file("a.docx"), 1).inspected).toBe(true);
    expect(createItem(file("a.zip"), 1)).toMatchObject({ inspected: true, kind: "unsupported" });
    expect(createItem(file("empty.pdf", "application/pdf", 0), 1)).toMatchObject({ inspected: true, error: "This file is empty." });
  });
});
