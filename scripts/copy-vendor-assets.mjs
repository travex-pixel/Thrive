// Copies pdf.js runtime assets into public/ so they are served from our own
// origin. This keeps the Content-Security-Policy strict (no third-party CDNs)
// and lets the app work offline once loaded.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let pdfjsRoot;
try {
  pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
} catch {
  console.warn("[copy-vendor-assets] pdfjs-dist not installed yet; skipping.");
  process.exit(0);
}

const target = join(root, "public", "vendor", "pdfjs");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

const copies = [
  // Legacy build: wider browser support (older iOS Safari).
  ["legacy/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["standard_fonts", "standard_fonts"],
  ["cmaps", "cmaps"],
  // JPEG 2000 / JBIG2 decoders (common in scanned statements) and ICC profiles.
  ["wasm", "wasm"],
  ["iccs", "iccs"],
];

for (const [from, to] of copies) {
  const src = join(pdfjsRoot, from);
  if (!existsSync(src)) {
    console.warn(`[copy-vendor-assets] missing ${from} in pdfjs-dist`);
    continue;
  }
  cpSync(src, join(target, to), { recursive: true });
}

console.log("[copy-vendor-assets] pdf.js assets copied to public/vendor/pdfjs");
