// Copies pdf.js runtime assets into public/ so they are served from our own
// origin. This keeps the Content-Security-Policy strict (no third-party CDNs)
// and lets the app work offline once loaded.
//
// Assets go under a versioned folder (public/vendor/pdfjs/<version>/) so a
// browser that cached an older worker can never pair it with newer pdf.js code.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let pdfjsRoot;
try {
  pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
} catch {
  // During the very first `npm install`, postinstall can run before dependencies exist.
  if (process.env.npm_lifecycle_event === "postinstall") {
    console.warn("[copy-vendor-assets] pdfjs-dist not installed yet; skipping.");
    process.exit(0);
  }
  console.error("[copy-vendor-assets] pdfjs-dist is not installed. Run npm install.");
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(pdfjsRoot, "package.json"), "utf8"));
const vendor = join(root, "public", "vendor", "pdfjs");
const target = join(vendor, version);
rmSync(vendor, { recursive: true, force: true });
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

const missing = copies.filter(([from]) => !existsSync(join(pdfjsRoot, from))).map(([from]) => from);
if (missing.length > 0) {
  console.error(`[copy-vendor-assets] pdfjs-dist ${version} is missing: ${missing.join(", ")}`);
  process.exit(1);
}
for (const [from, to] of copies) cpSync(join(pdfjsRoot, from), join(target, to), { recursive: true });

console.log(`[copy-vendor-assets] pdf.js ${version} assets copied to public/vendor/pdfjs/${version}`);
