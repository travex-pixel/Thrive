import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  addFiles,
  assertImmiReady,
  buildPack,
  downloadZip,
  fixture,
  generated,
  openStep,
  resultNames,
  watchErrors,
  watchExternalRequests,
} from "./helpers";

test.describe("pack builder", () => {
  test("core journey: add, auto-sort, build and download a free pack", async ({ page }) => {
    const external = watchExternalRequests(page);
    const errors = watchErrors(page);
    await page.goto("/build");

    await addFiles(page, [
      fixture("IMG_4821.JPG"),
      fixture("IMG_5530.HEIC"),
      fixture("Screenshot 2025-01-09 at 21.14.03.png"),
      fixture("Holiday Bali 2024-07-12.webp"),
      fixture("CBA statement March 2025 (secured).pdf"),
      fixture("Relationship statement.docx"),
      generated("Lease agreement 2023-07-01.pdf"),
      generated("AGL electricity bill 05-2025.pdf"),
      generated("Passport - Alex.pdf"),
      generated("Form 888 - Jordan.pdf"),
    ]);

    // EXIF date read from the photo itself (its name has no date).
    await expect(page.getByText("15 Mar 2024")).toBeVisible();
    // Locked bank PDF is detected.
    await expect(page.getByLabel("Locked PDF")).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Sort your files" })).toBeVisible();

    // Suggestions from file names.
    await expect(page.getByLabel("Group for CBA statement March 2025 (secured)")).toHaveValue("financial");
    await expect(page.getByLabel("Group for Lease agreement 2023 07 01")).toHaveValue("household");
    await expect(page.getByLabel("Group for Passport - Alex")).toHaveValue("identity");
    await expect(page.getByLabel("Group for Form 888 - Jordan")).toHaveValue("forms");
    await expect(page.getByLabel("Group for IMG 5530")).toHaveValue("social");
    await expect(page.getByLabel("Group for Screenshot 2025 01 09 at 21.14.03")).toHaveValue("unsorted");

    // Sort the one unsorted screenshot by hand.
    await page.getByLabel("Group for Screenshot 2025 01 09 at 21.14.03").selectOption("commitment");
    await page.getByRole("button", { name: "They look right" }).click();
    await expect(page.getByText("Suggested", { exact: true })).toHaveCount(0);

    await buildPack(page);
    expect(await resultNames(page)).toEqual([
      "00 Evidence index.pdf",
      "01 Financial evidence.pdf",
      "02 Household evidence.pdf",
      "03 Social evidence.pdf",
      "04 Commitment evidence.pdf",
      "05 Identity - Passport - Alex.pdf",
      "06 Forms & statements - Form 888 - Jordan.pdf",
      "07 Forms & statements - Relationship statement.docx",
    ]);
    // Free pack (10 files): no paywall.
    await expect(page.getByRole("heading", { name: /Unlock your full pack/ })).toHaveCount(0);

    const files = await downloadZip(page);
    const pages = await assertImmiReady(files);
    // Social: contents page + 3 photos (JPG, HEIC converted, WEBP converted).
    expect(pages["03 Social evidence.pdf"]).toBe(4);
    // Financial: contents page + re-rendered secured statement (1 page).
    expect(pages["01 Financial evidence.pdf"]).toBe(2);
    // Household: contents page + lease (3) + bill (1), in date order.
    expect(pages["02 Household evidence.pdf"]).toBe(5);
    // Separate clean PDFs pass through untouched.
    expect(Buffer.from(files["05 Identity - Passport - Alex.pdf"]).equals(readFileSync(generated("Passport - Alex.pdf")))).toBe(true);
    expect(Buffer.from(files["07 Forms & statements - Relationship statement.docx"]).equals(readFileSync(fixture("Relationship statement.docx")))).toBe(true);
    expect(pages["00 Evidence index.pdf"]).toBeGreaterThanOrEqual(1);

    expect(external, "nothing may be sent to third parties").toEqual([]);
    expect(errors).toEqual([]);
  });

  test("unusable files are explained and left out", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [fixture("Payslip (password).pdf"), fixture("video.mov"), generated("AGL electricity bill 05-2025.pdf")]);
    await expect(page.getByText(/needs a password to open/)).toBeVisible();
    await expect(page.getByText(/doesn’t accept this file type/)).toBeVisible();
    await expect(page.getByText("2 files need attention")).toBeVisible();

    await buildPack(page);
    expect(await resultNames(page)).toEqual(["00 Evidence index.pdf", "01 Household evidence.pdf"]);
  });

  test("work survives a reload (saved on this device)", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [generated("Passport - Alex.pdf"), fixture("IMG_4821.JPG")]);
    await page.reload();
    // Returning users land on Sort with their files restored.
    await expect(page.getByRole("heading", { name: "Sort your files" })).toBeVisible();
    await expect(page.getByLabel("Group for Passport - Alex")).toHaveValue("identity");
    await expect(page.getByLabel("Group for IMG 4821")).toHaveValue("social");
  });

  test("clear everything removes files from this browser", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [generated("Passport - Alex.pdf")]);
    await page.getByRole("button", { name: "On this device" }).click();
    await page.getByRole("button", { name: "Clear everything from this browser" }).click();
    await page.getByRole("button", { name: "Yes, clear everything" }).click();
    await expect(page.getByText("Everything has been cleared from this browser.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Add your evidence" })).toBeVisible();
    await expect(page.getByText("files added")).toHaveCount(0);
  });

  test("builds with the network off once loaded (privacy claim)", async ({ page, context }) => {
    const external = watchExternalRequests(page);
    await page.goto("/build");
    await page.waitForLoadState("networkidle");
    // Give the background warm-up time to fetch libraries, fonts and the PDF worker.
    await page.waitForTimeout(2500);
    await context.setOffline(true);
    await addFiles(page, [generated("Lease agreement 2023-07-01.pdf"), fixture("IMG_4821.JPG"), fixture("CBA statement March 2025 (secured).pdf")]);
    await buildPack(page);
    const files = await downloadZip(page);
    await assertImmiReady(files);
    await context.setOffline(false);
    expect(external).toEqual([]);
  });

  test("large pack: splits and compresses under 5 MB, paywall, unlock flow", async ({ page }) => {
    test.setTimeout(400_000);
    await page.goto("/build");
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m) =>
      generated(`Westpac joint account statement 2025-${m}.pdf`),
    );
    await addFiles(page, [...months, generated("Statement bundle 2023.pdf"), generated("Scanned bills 2024 (huge).pdf"), fixture("IMG_4821.JPG")]);
    await buildPack(page);

    const names = await resultNames(page);
    expect(names.filter((n) => /^\d\d Financial evidence \(part \d+ of \d+\)\.pdf$/.test(n)).length).toBeGreaterThan(1);
    expect(names.some((n) => /Household evidence/.test(n))).toBe(true);
    await expect(page.getByText(/re-rendered as images/)).toBeVisible();

    // 15 files > free limit: downloads are locked behind the paywall.
    await expect(page.getByRole("heading", { name: /Unlock your full pack/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download all (.zip)" })).toHaveCount(0);

    // Payments aren't configured in tests: the real API answers 503 and the UI explains it.
    await page.getByRole("button", { name: "Unlock for A$29" }).first().click();
    await expect(page.getByText(/Payments aren’t switched on yet/)).toBeVisible();

    // Simulate Stripe: checkout returns a URL; verification confirms payment (no real money involved).
    await page.route("**/api/checkout", (route) => route.fulfill({ json: { url: "/unlock?session_id=cs_test_a1b2c3d4e5f6g7h8" } }));
    await page.route("**/api/verify**", (route) => route.fulfill({ json: { token: "v1.eyJ2IjoxfQ.c2lnbmF0dXJl" } }));
    await page.getByRole("button", { name: "Unlock for A$29" }).first().click();
    await expect(page.getByRole("heading", { name: "You’re unlocked" })).toBeVisible();
    await expect(page.getByLabel("Your unlock link")).toHaveValue(/session_id=cs_test_a1b2c3d4e5f6g7h8/);
    await page.getByRole("link", { name: "Back to my pack" }).click();
    await expect(page.getByText(/Unlocked. Thank you!/)).toBeVisible();

    await buildPack(page);
    const files = await downloadZip(page);
    const pages = await assertImmiReady(files);
    const financialParts = Object.keys(pages).filter((n) => /Financial evidence/.test(n));
    expect(financialParts.length).toBeGreaterThan(1);
    // Every statement page made it into the pack: 12 × 2 + 40 bundle pages (+ one contents page per part).
    const contentPages = financialParts.reduce((n, name) => n + pages[name] - 1, 0);
    expect(contentPages).toBe(12 * 2 + 40);
  });
});
