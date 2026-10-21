import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { fixture, generated, IMMI_MAX_BYTES, watchExternalRequests } from "./helpers";

test.describe("free single-file fixer", () => {
  test("converts an iPhone HEIC photo to a JPG", async ({ page }) => {
    const external = watchExternalRequests(page);
    await page.goto("/fix");
    await page.getByTestId("fix-input").setInputFiles(fixture("IMG_5530.HEIC"));
    await expect(page.getByRole("heading", { name: "Ready for ImmiAccount" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Converted the iPhone HEIC photo to JPG/)).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download IMG 5530 \(ImmiAccount ready\)\.jpg/ }).click();
    const bytes = readFileSync((await (await download).path())!);
    expect(bytes.length).toBeLessThanOrEqual(IMMI_MAX_BYTES);
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])); // JPEG magic
    expect(external).toEqual([]);
  });

  test("shrinks a 30 MB scanned PDF into parts under 5 MB", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/fix");
    await page.getByTestId("fix-input").setInputFiles(generated("Scanned bills 2024 (huge).pdf"));
    await expect(page.getByRole("heading", { name: "Ready for ImmiAccount" })).toBeVisible({ timeout: 200_000 });
    const buttons = page.getByTestId("fix-results").getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(1);
    let totalPages = 0;
    for (let i = 0; i < count; i++) {
      const download = page.waitForEvent("download");
      await buttons.nth(i).click();
      const bytes = readFileSync((await (await download).path())!);
      expect(bytes.length).toBeLessThanOrEqual(IMMI_MAX_BYTES);
      totalPages += (await PDFDocument.load(bytes)).getPageCount();
    }
    expect(totalPages).toBe(5);
  });

  test("leaves accepted Office files alone and explains why", async ({ page }) => {
    await page.goto("/fix");
    await page.getByTestId("fix-input").setInputFiles(fixture("Relationship statement.docx"));
    await expect(page.getByText(/already under 5 MB, so no changes are needed/)).toBeVisible();
  });

  test("explains password-protected PDFs", async ({ page }) => {
    await page.goto("/fix");
    await page.getByTestId("fix-input").setInputFiles(fixture("Payslip (password).pdf"));
    await expect(page.getByText(/needs a password to open/)).toBeVisible();
  });
});
