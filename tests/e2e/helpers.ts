import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

export const FIXTURES = join(__dirname, "..", "fixtures");
export const GENERATED = join(__dirname, ".artifacts", "fixtures");
export const fixture = (name: string) => join(FIXTURES, name);
export const generated = (name: string) => join(GENERATED, name);
export const IMMI_MAX_BYTES = 5_000_000;

/** Records every request that leaves localhost, to prove nothing is uploaded. */
export function watchExternalRequests(page: Page) {
  const external: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && !url.protocol.startsWith("blob") && !url.protocol.startsWith("data")) {
      external.push(`${req.method()} ${req.url()}`);
    }
  });
  return external;
}

/** Collects console errors and uncaught exceptions. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

export async function addFiles(page: Page, paths: string[]) {
  await page.getByTestId("file-input").setInputFiles(paths);
  await expect(page.getByText(`${paths.length} ${paths.length === 1 ? "file" : "files"} added`, { exact: false })).toBeVisible();
  // Wait for background checks (page counts, EXIF dates) to finish.
  await expect(page.getByLabel("Checking file")).toHaveCount(0, { timeout: 60_000 });
}

export async function openStep(page: Page, step: "1  Add" | "2  Sort" | "3  Build") {
  await page.getByRole("radio", { name: step }).click();
}

export async function buildPack(page: Page) {
  await openStep(page, "3  Build");
  const button = page.getByRole("button", { name: /^(Build|Rebuild) pack$/ });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole("heading", { name: /^Your pack is ready/ })).toBeVisible({ timeout: 180_000 });
}

/** Uses "Sort by type": puts every unsorted file of a type into a group in one go. Keys are the type labels. */
export async function sortByType(page: Page, groups: Record<string, string>) {
  for (const [type, group] of Object.entries(groups)) {
    await page.getByLabel(`Group for ${type}`, { exact: true }).selectOption(group);
  }
}

/** Confirms every automatic date from the "Check dates" sheet. */
export async function confirmAllDates(page: Page) {
  await page.getByRole("button", { name: "Check dates" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Check dates" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /dates? (are|is) right$/ }).click();
  await expect(sheet).toHaveCount(0);
}

/** All text in a PDF, page by page (pdf.js in Node). */
export async function pdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: bytes.slice(), disableFontFace: true, useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  await pdf.loadingTask.destroy();
  return pages.join("\n");
}

export async function resultNames(page: Page): Promise<string[]> {
  return page.getByTestId("results").locator("li p.truncate").allInnerTexts();
}

export async function downloadZip(page: Page): Promise<Record<string, Uint8Array>> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all (.zip)" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  return unzipSync(new Uint8Array(readFileSync(path!)));
}

/** Every file must fit ImmiAccount's limit and every PDF must open cleanly. */
export async function assertImmiReady(files: Record<string, Uint8Array>) {
  const pages: Record<string, number> = {};
  for (const [name, bytes] of Object.entries(files)) {
    // Letters, numbers and underscores only: the safest names for any upload form.
    expect(name, `${name} has unsafe characters`).toMatch(/^[A-Za-z0-9_]+\.[a-z]+$/);
    expect(bytes.length, `${name} is over 5 MB`).toBeLessThanOrEqual(IMMI_MAX_BYTES);
    expect(bytes.length, `${name} is empty`).toBeGreaterThan(0);
    if (name.endsWith(".pdf")) {
      const doc = await PDFDocument.load(bytes); // throws if corrupt or encrypted
      expect(doc.isEncrypted, `${name} is still encrypted`).toBe(false);
      pages[name] = doc.getPageCount();
    }
  }
  return pages;
}
