import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { zipToBlob } from "@/lib/download";

describe("zipToBlob", () => {
  it("writes a valid stored ZIP that standard tools can read", async () => {
    const a = new Uint8Array(Array.from({ length: 5000 }, (_, i) => i % 251));
    const b = new TextEncoder().encode("hello");
    const blob = await zipToBlob(
      [
        { fileName: "01_Financial_evidence.pdf", blob: new Blob([a]) },
        { fileName: "02_Identity_Passport.pdf", blob: new Blob([b]) },
      ],
      new Date(2026, 9, 21, 10, 30, 0),
    );
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files)).toEqual(["01_Financial_evidence.pdf", "02_Identity_Passport.pdf"]);
    expect(files["01_Financial_evidence.pdf"]).toEqual(a);
    expect(new TextDecoder().decode(files["02_Identity_Passport.pdf"])).toBe("hello");
  });

  it("handles an empty list", async () => {
    const blob = await zipToBlob([]);
    expect(blob.size).toBe(22);
    expect(unzipSync(new Uint8Array(await blob.arrayBuffer()))).toEqual({});
  });
});
