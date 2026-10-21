/**
 * Generates large, realistic PDFs for the E2E tests (kept out of git).
 * - Monthly text statements (small, copyable PDFs)
 * - A 40-page statement bundle over 5 MB with light pages (must be split by pages)
 * - A huge "scanned" PDF with heavy pages (must be re-rendered and compressed)
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const GENERATED = join(__dirname, ".artifacts", "fixtures");

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

/** Incompressible RGB noise PNG (cryptographic random bytes): a worst case for file size. */
function noisePng(width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // filter: none
    randomBytes(width * 3).copy(raw, row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 1 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function textPdf(title: string, pages: number, extraLines: string[] = []): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(title, { x: 50, y: 780, size: 18, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(`Page ${p + 1} of ${pages}`, { x: 50, y: 755, size: 10, font });
    extraLines.forEach((line, i) => page.drawText(line, { x: 50, y: 720 - i * 16, size: 11, font }));
    for (let r = 0; r < 25; r++) {
      page.drawText(`0${(r % 9) + 1}/0${(p % 9) + 1}  EFTPOS PURCHASE ${1000 + r * 7}   -$${(r * 3.17).toFixed(2)}`, { x: 50, y: 600 - r * 18, size: 10, font });
    }
  }
  return doc.save();
}

async function imagePdf(pages: number, size: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let p = 0; p < pages; p++) {
    const png = await doc.embedPng(noisePng(size, size));
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(png, { x: 20, y: 120, width: 555, height: 555 });
  }
  return doc.save();
}

export default async function globalSetup() {
  mkdirSync(GENERATED, { recursive: true });
  const marker = join(GENERATED, ".v3");
  if (existsSync(marker)) return;

  const months = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"];
  for (const m of months) {
    writeFileSync(join(GENERATED, `Westpac joint account statement ${m}.pdf`), await textPdf(`Joint account statement ${m}`, 2));
  }
  writeFileSync(join(GENERATED, "Lease agreement 2023-07-01.pdf"), await textPdf("Residential tenancy agreement", 3, ["Tenants: Alex Citizen and Sam Lee"]));
  writeFileSync(join(GENERATED, "AGL electricity bill 05-2025.pdf"), await textPdf("Electricity bill", 1));
  writeFileSync(join(GENERATED, "Passport - Alex.pdf"), await textPdf("Passport (test)", 1));
  writeFileSync(join(GENERATED, "Form 888 - Jordan.pdf"), await textPdf("Statutory declaration (test)", 2));

  // ~8 MB across 40 light pages (~200 KB each): copied as-is, but must be split by pages.
  writeFileSync(join(GENERATED, "Statement bundle 2023.pdf"), await imagePdf(40, 260));
  // ~30 MB across 5 heavy pages (~6 MB each): must be re-rendered and compressed.
  writeFileSync(join(GENERATED, "Scanned bills 2024 (huge).pdf"), await imagePdf(5, 1400));

  writeFileSync(marker, "ok");
}
