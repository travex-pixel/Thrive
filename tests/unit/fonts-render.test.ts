import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

/**
 * Regression test for blank text: pdf-lib's subsetting once drew most glyphs of the bundled font blank, and text
 * extraction didn't notice (it reads the Unicode map, not the drawn shapes). This renders real pages with poppler
 * and counts ink. Skipped where poppler (pdftoppm) isn't installed.
 */
const hasPoppler = (() => {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

async function ink(subset: boolean): Promise<number> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(readFileSync("public/fonts/NotoSans-Regular.ttf"), { subset });
  const semibold = await doc.embedFont(readFileSync("public/fonts/NotoSans-SemiBold.ttf"), { subset });
  const page = doc.addPage([400, 120]);
  page.drawText("Other evidence", { x: 20, y: 70, size: 24, font: semibold });
  page.drawText("Joint account statement 2025-01 · 15 Mar 2024 · Ngân hàng · Ελλάδα · Москва", { x: 20, y: 30, size: 10, font: regular });
  const dir = mkdtempSync(join(tmpdir(), "lr-font-"));
  writeFileSync(join(dir, "t.pdf"), await doc.save());
  execFileSync("pdftoppm", ["-r", "100", "-gray", "-singlefile", join(dir, "t.pdf"), join(dir, "t")]);
  // PGM (P5): header of three lines, then one byte per pixel.
  const pgm = readFileSync(join(dir, "t.pgm"));
  let offset = 0;
  for (let lines = 0; lines < 3; offset++) if (pgm[offset] === 0x0a) lines++;
  let dark = 0;
  for (let i = offset; i < pgm.length; i++) if (pgm[i] < 128) dark++;
  return dark;
}

describe.skipIf(!hasPoppler)("embedded font", () => {
  it("draws every glyph when subset, as it does when embedded whole", async () => {
    const [subset, whole] = [await ink(true), await ink(false)];
    expect(whole).toBeGreaterThan(500);
    expect(subset).toBeGreaterThan(whole * 0.95);
  });
});
