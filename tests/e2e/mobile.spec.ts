import { expect, test } from "@playwright/test";
import { addFiles, assertImmiReady, buildPack, downloadZip, fixture, generated, sortByType } from "./helpers";

test.describe("phone-sized journey", () => {
  test("add, sort, build and download on a phone", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [fixture("IMG_4821.JPG"), fixture("IMG_5530.HEIC"), generated("Lease agreement 2023-07-01.pdf"), fixture("Screenshot 2025-01-09 at 21.14.03.png")]);

    // The primary action sits in a bottom bar, fully on screen (thumb reach).
    const bar = page.getByRole("button", { name: "Continue" });
    const box = (await bar.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.y).toBeGreaterThan(viewport.height * 0.75);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await bar.click();
    await sortByType(page, {
      "Couldn’t tell from the name": "commitment",
      "Leases, property documents and mail": "household",
      Photos: "social",
    });

    // Long names never cause sideways scrolling.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Editing opens as a bottom sheet.
    await page.getByRole("button", { name: /Lease agreement/ }).click();
    const dialog = page.getByRole("dialog", { name: "File details" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Title").fill("Lease: Rose St, Brunswick");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Lease: Rose St, Brunswick")).toBeVisible();

    await buildPack(page);
    const files = await downloadZip(page);
    await assertImmiReady(files);
    expect(Object.keys(files)).toEqual(["00_Evidence_index.pdf", "01_Household_evidence.pdf", "02_Social_evidence.pdf", "03_Commitment_evidence.pdf"]);
  });
});
