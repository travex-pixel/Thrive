// Generates a realistic large evidence folder: camera-size photos (made in Chromium), statements, screenshots, locked PDFs.
import { createRequire } from "node:module";
import { copyFileSync, writeFileSync } from "node:fs";
const require = createRequire(`${process.cwd()}/package.json`);
const { chromium } = require("@playwright/test");
const out = process.argv[2];
const PHOTOS = Number(process.argv[3] ?? 120);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
for (let i = 0; i < PHOTOS; i++) {
  const b64 = await page.evaluate(async (seed) => {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const c = new OffscreenCanvas(4032, 3024);
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 4032, 3024);
    grad.addColorStop(0, `hsl(${rnd() * 360},50%,60%)`);
    grad.addColorStop(1, `hsl(${rnd() * 360},50%,30%)`);
    g.fillStyle = grad; g.fillRect(0, 0, 4032, 3024);
    for (let k = 0; k < 400; k++) {
      g.fillStyle = `hsla(${rnd() * 360},60%,${30 + rnd() * 50}%,${0.3 + rnd() * 0.7})`;
      g.beginPath(); g.arc(rnd() * 4032, rnd() * 3024, 10 + rnd() * 300, 0, 7); g.fill();
    }
    // fine texture, like real camera detail
    const img = g.getImageData(0, 0, 4032, 3024);
    for (let p = 0; p < img.data.length; p += 4) { const n = (rnd() - 0.5) * 24; img.data[p] += n; img.data[p + 1] += n; img.data[p + 2] += n; }
    g.putImageData(img, 0, 0);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let j = 0; j < bytes.length; j += 0x8000) bin += String.fromCharCode(...bytes.subarray(j, j + 0x8000));
    return btoa(bin);
  }, i + 1);
  writeFileSync(`${out}/IMG_${String(1000 + i)}.JPG`, Buffer.from(b64, "base64"));
}
await browser.close();
const gen = `${process.cwd()}/tests/e2e/.artifacts/fixtures/`;
for (let i = 0; i < 150; i++) {
  const y = 2020 + Math.floor(i / 30), m = String((i % 12) + 1).padStart(2, "0");
  copyFileSync(gen + "Westpac joint account statement 2025-01.pdf", `${out}/Westpac statement ${y}-${m} acct${i}.pdf`);
}
for (let i = 0; i < 20; i++) copyFileSync(`${process.cwd()}/tests/fixtures/Screenshot 2025-01-09 at 21.14.03.png`, `${out}/Screenshot 2025-02-${String(i + 1).padStart(2, "0")} at 10.00.00.png`);
for (let i = 0; i < 10; i++) copyFileSync(`${process.cwd()}/tests/fixtures/CBA statement March 2025 (secured).pdf`, `${out}/CBA statement ${i + 1} 2024 (secured).pdf`);
console.log("done");
