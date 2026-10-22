import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  addFiles,
  assertImmiReady,
  buildPack,
  confirmAllDates,
  downloadZip,
  fixture,
  generated,
  openStep,
  pdfText,
  resultNames,
  sortByType,
  watchErrors,
  watchExternalRequests,
} from "./helpers";

const TOKEN = "v1.eyJ2IjoxfQ.c2lnbmF0dXJl";
const SESSION = "cs_test_a1b2c3d4e5f6g7h8";
const statements = (n: number) =>
  ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].slice(0, n).map((m) => generated(`Westpac joint account statement 2025-${m}.pdf`));

test.describe("pack builder", () => {
  test("core journey: add, sort by type, check dates, build and download a free pack", async ({ page }) => {
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

    // The photo's own date is read from its EXIF data (its name has no date).
    await expect(page.getByText("15 Mar 2024")).toBeVisible();
    // The locked bank PDF is detected, and the reason is visible (not only on hover).
    await expect(page.getByText(/locked PDF: a clean copy will be made/)).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Sort your files" })).toBeVisible();
    // Nothing is put into a group automatically: LodgeReady only says what each file looks like.
    await expect(page.getByLabel("Group for Passport - Alex")).toHaveValue("unsorted");
    await expect(page.getByRole("heading", { name: "Sort by type" })).toBeVisible();

    await sortByType(page, {
      "Bank, loan and pay documents": "financial",
      "Leases, property documents and mail": "household",
      "Bills, insurance and accounts": "household",
      Photos: "social",
      "Couldn’t tell from the name": "commitment",
      "Statements and letters": "forms",
      "Forms and declarations": "forms",
      "ID documents and certificates": "identity",
    });
    await expect(page.getByRole("heading", { name: "Sort by type" })).toHaveCount(0);
    await expect(page.getByLabel("Group for Passport - Alex")).toHaveValue("identity");
    await expect(page.getByLabel("Group for IMG 5530")).toHaveValue("social");

    // Suggested dates are flagged until checked; a screenshot's file-name date is never used.
    await expect(page.getByText("Not checked").first()).toBeVisible();
    await confirmAllDates(page);
    await expect(page.getByText("Not checked")).toHaveCount(0);

    await buildPack(page);
    expect(await resultNames(page)).toEqual([
      "00_Evidence_index.pdf",
      "01_Financial_evidence.pdf",
      "02_Household_evidence.pdf",
      "03_Social_evidence.pdf",
      "04_Commitment_evidence.pdf",
      "05_Identity_Passport_Alex.pdf",
      "06_Forms_and_statements_Form_888_Jordan.pdf",
      "07_Forms_and_statements_Relationship_statement.docx",
    ]);
    // Free pack (10 files): no paywall.
    await expect(page.getByRole("heading", { name: /Download your full pack/ })).toHaveCount(0);

    const files = await downloadZip(page);
    const pages = await assertImmiReady(files);
    // Social: contents page + 3 photos (JPG, HEIC converted, WEBP converted).
    expect(pages["03_Social_evidence.pdf"]).toBe(4);
    // Commitment: contents page + a normal phone screenshot on one page.
    expect(pages["04_Commitment_evidence.pdf"]).toBe(2);
    // Financial: contents page + re-rendered secured statement (1 page).
    expect(pages["01_Financial_evidence.pdf"]).toBe(2);
    // Household: contents page + lease (3) + bill (1), in date order.
    expect(pages["02_Household_evidence.pdf"]).toBe(5);
    // Separate clean PDFs pass through untouched.
    expect(Buffer.from(files["05_Identity_Passport_Alex.pdf"]).equals(readFileSync(generated("Passport - Alex.pdf")))).toBe(true);
    expect(Buffer.from(files["07_Forms_and_statements_Relationship_statement.docx"]).equals(readFileSync(fixture("Relationship statement.docx")))).toBe(true);
    expect(pages["00_Evidence_index.pdf"]).toBeGreaterThanOrEqual(1);
    // Checked dates are printed; untitled phone photos read "Photo (IMG_4821)".
    const social = await pdfText(files["03_Social_evidence.pdf"]);
    expect(social).toContain("15 Mar 2024");
    expect(social).toContain("Photo (IMG_4821)");

    expect(external, "nothing may be sent to third parties").toEqual([]);
    expect(errors).toEqual([]);
  });

  test("automatic dates are used for order but never printed until checked", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [fixture("IMG_4821.JPG"), fixture("Holiday Bali 2024-07-12.webp")]);
    await openStep(page, "2  Sort");
    await sortByType(page, { Photos: "social" });
    await buildPack(page);
    let text = await pdfText((await downloadZip(page))["01_Social_evidence.pdf"]);
    expect(text).not.toContain("15 Mar 2024");
    expect(text).not.toContain("12 Jul 2024");
    // Ordered by the suggested dates even so: March before July.
    expect(text.indexOf("IMG_4821")).toBeLessThan(text.indexOf("Holiday Bali"));

    await openStep(page, "3  Build");
    await expect(page.getByText(/2 dates haven’t been checked/)).toBeVisible();
    await page.getByRole("button", { name: "Check dates" }).first().click();
    await page.getByRole("dialog", { name: "Check dates" }).getByRole("button", { name: "All 2 dates are right" }).click();
    await buildPack(page);
    text = await pdfText((await downloadZip(page))["01_Social_evidence.pdf"]);
    expect(text).toContain("15 Mar 2024");
    expect(text).toContain("12 Jul 2024");
  });

  test("a long chat screenshot is cut into readable pages", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [generated("Chat with Sam (long).png")]);
    await openStep(page, "2  Sort");
    await sortByType(page, { "Messages and call logs": "commitment" });
    await buildPack(page);
    const files = await downloadZip(page);
    const pages = await assertImmiReady(files);
    // Contents page + three phone-screen-sized pieces.
    expect(pages["01_Commitment_evidence.pdf"]).toBe(4);
  });

  test("unusable files are explained and left out", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [fixture("Payslip (password).pdf"), fixture("video.mov"), generated("AGL electricity bill 05-2025.pdf")]);
    await expect(page.getByText(/needs a password to open/)).toBeVisible();
    await expect(page.getByText(/LodgeReady can’t use this file type/)).toBeVisible();
    await expect(page.getByText("2 files need attention")).toBeVisible();

    await buildPack(page);
    // Not sorted: it goes into Other, and the plan said so.
    expect(await resultNames(page)).toEqual(["00_Evidence_index.pdf", "01_Other_evidence.pdf"]);
    // The result says plainly what isn't in the pack, and why.
    await expect(page.getByRole("heading", { name: "Your pack is ready, but 2 files were left out" })).toBeVisible();
    await expect(page.getByTestId("skipped")).toContainText("Payslip (password)");
    await expect(page.getByTestId("skipped")).toContainText("video");
  });

  test("asks for the attachment limit instead of assuming one", async ({ page }) => {
    await page.goto("/build");
    // 36 separate files: more than the lowest limit Home Affairs mentions (30).
    for (let batch = 1; batch <= 3; batch++) {
      await page.getByTestId("file-input").setInputFiles(statements(12));
      await expect(page.getByText(`${batch * 12} files added`)).toBeVisible();
    }
    await expect(page.getByLabel("Checking file")).toHaveCount(0, { timeout: 60_000 });
    await openStep(page, "2  Sort");
    await sortByType(page, { "Bank, loan and pay documents": "identity" });
    await openStep(page, "3  Build");
    await expect(page.getByRole("heading", { name: "Check your attachment limit" })).toBeVisible();
    await expect(page.getByText(/This pack has 37 files/)).toBeVisible();
    await page.getByRole("button", { name: "30", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Check your attachment limit" })).toHaveCount(0);
    await expect(page.getByText("37 of 30 attachments: over your limit")).toBeVisible();
    await expect(page.getByText(/This pack has 37 files and your limit is set to 30/)).toBeVisible();
  });

  test("numbering can carry on after files already uploaded", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [statements(1)[0], generated("Passport - Alex.pdf")]);
    await openStep(page, "2  Sort");
    await sortByType(page, { "Bank, loan and pay documents": "financial", "ID documents and certificates": "identity" });
    await openStep(page, "3  Build");
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("First file number").fill("20");
    await page.getByRole("button", { name: "Done" }).click();
    await buildPack(page);
    expect(await resultNames(page)).toEqual(["20_Evidence_index.pdf", "21_Financial_evidence.pdf", "22_Identity_Passport_Alex.pdf"]);
  });

  test("work survives a reload (saved on this device)", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, [generated("Passport - Alex.pdf"), fixture("IMG_4821.JPG")]);
    await openStep(page, "2  Sort");
    await page.getByLabel("Group for Passport - Alex").selectOption("identity");
    await page.getByLabel("Group for IMG 4821").selectOption("social");
    await page.reload();
    // Returning users land on Sort with their files and groups restored.
    await expect(page.getByRole("heading", { name: "Sort your files" })).toBeVisible();
    await expect(page.getByLabel("Group for Passport - Alex")).toHaveValue("identity");
    await expect(page.getByLabel("Group for IMG 4821")).toHaveValue("social");
  });

  test("only one tab changes the saved files at a time", async ({ page, context }) => {
    await page.goto("/build");
    await addFiles(page, [generated("Passport - Alex.pdf")]);
    const second = await context.newPage();
    await second.goto("/build");
    await expect(second.getByRole("heading", { name: "Sort your files" })).toBeVisible();
    await expect(second.getByLabel("Group for Passport - Alex")).toBeVisible();
    // The first tab steps aside instead of overwriting the second tab's work.
    await expect(page.getByRole("heading", { name: "LodgeReady is open in another tab" })).toBeVisible();
    await second.close();
    await page.getByRole("button", { name: "Use this tab instead" }).click();
    await expect(page.getByLabel("Group for Passport - Alex")).toBeVisible();
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
    // The photo's date still comes through offline.
    await expect(page.getByText("15 Mar 2024")).toBeVisible();
    await buildPack(page);
    const files = await downloadZip(page);
    await assertImmiReady(files);
    await context.setOffline(false);
    expect(external).toEqual([]);
  });

  test("downloads follow the pack that was built, not later edits", async ({ page }) => {
    await page.goto("/build");
    await addFiles(page, statements(11));
    await openStep(page, "2  Sort");
    await sortByType(page, { "Bank, loan and pay documents": "financial" });
    await buildPack(page);
    await expect(page.getByRole("heading", { name: /Download your full pack/ })).toBeVisible();

    // Remove two files after building: the 11-file pack must not become downloadable for free.
    await openStep(page, "2  Sort");
    await page.getByLabel("Select Westpac joint account statement 2025 01").check();
    await page.getByLabel("Select Westpac joint account statement 2025 02").check();
    await page.getByRole("button", { name: "Remove selected files" }).click();
    await page.getByRole("dialog", { name: "Remove 2 files?" }).getByRole("button", { name: "Remove", exact: true }).click();
    await openStep(page, "3  Build");
    await expect(page.getByText(/downloads are paused/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Download your full pack/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download all (.zip)" })).toHaveCount(0);

    // Rebuilding with 9 files makes it a free pack.
    await buildPack(page);
    await expect(page.getByRole("heading", { name: /Download your full pack/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Download all (.zip)" })).toBeVisible();
  });

  test("restoring a purchase unlocks the builder", async ({ page, context }) => {
    await context.route("**/api/verify**", (route) => route.fulfill({ json: { token: TOKEN } }));
    await page.goto("/build");
    await addFiles(page, statements(11));
    await buildPack(page);
    await page.getByRole("button", { name: "Restore a purchase" }).click();
    await page.getByLabel("Unlock link").fill(`https://lodgeready.example/unlock?session_id=${SESSION}`);
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    await expect(page.getByRole("heading", { name: "You’re unlocked" })).toBeVisible();
    await page.getByRole("link", { name: "Back to my pack" }).click();
    await expect(page.getByText(/Unlocked. Thank you!/)).toBeVisible();
    // No dialog left open, and the pack downloads after a rebuild.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await buildPack(page);
    await expect(page.getByRole("button", { name: "Download all (.zip)" })).toBeVisible();
  });

  test("large pack: splits and compresses under 5 MB, paywall, checkout in a new tab", async ({ page, context }) => {
    test.setTimeout(400_000);
    await page.goto("/build");
    await addFiles(page, [...statements(12), generated("Statement bundle 2023.pdf"), generated("Scanned bills 2024 (huge).pdf"), fixture("IMG_4821.JPG")]);
    await openStep(page, "2  Sort");
    await sortByType(page, {
      "Bank, loan and pay documents": "financial",
      "Couldn’t tell from the name": "financial",
      "Bills, insurance and accounts": "household",
      Photos: "social",
    });
    await buildPack(page);

    const names = await resultNames(page);
    expect(names.filter((n) => /^\d\d_Financial_evidence_part\d+of\d+\.pdf$/.test(n)).length).toBeGreaterThan(1);
    expect(names.some((n) => /Household_evidence/.test(n))).toBe(true);
    await expect(page.getByText(/re-rendered as images/)).toBeVisible();

    // 15 files > free limit: downloads are locked behind the paywall.
    await expect(page.getByRole("heading", { name: /Download your full pack/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download all (.zip)" })).toHaveCount(0);
    await expect(page.getByText("Locked").first()).toBeVisible();

    // Payments aren't configured in tests: the real API answers 503 and the UI explains it.
    await page.getByRole("button", { name: "Unlock for A$29" }).first().click();
    await expect(page.getByText(/Payments aren’t switched on yet/)).toBeVisible();

    // Simulate Stripe (no real money involved): checkout opens in a new tab and confirms the payment there.
    await context.route("**/api/checkout", (route) => route.fulfill({ json: { url: `/unlock?session_id=${SESSION}&tab=1`, id: SESSION } }));
    await context.route("**/api/verify**", (route) => route.fulfill({ json: { token: TOKEN } }));
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Unlock for A$29" }).first().click();
    const popup = await popupPromise;
    await expect(popup.getByRole("heading", { name: "You’re unlocked" })).toBeVisible();
    await expect(popup.getByLabel("Your unlock link")).toHaveValue(new RegExp(`session_id=${SESSION}`));
    await expect(popup.getByText(/Go back to your LodgeReady tab/)).toBeVisible();

    // The builder tab unlocks by itself, and the pack it already built downloads straight away.
    await expect(page.getByRole("button", { name: "Download all (.zip)" })).toBeVisible();
    const files = await downloadZip(page);
    const pages = await assertImmiReady(files);
    const financialParts = Object.keys(pages).filter((n) => /Financial_evidence/.test(n));
    expect(financialParts.length).toBeGreaterThan(1);
    // Every statement page made it into the pack: 12 × 2 + 40 bundle pages (+ one contents page per part).
    const contentPages = financialParts.reduce((n, name) => n + pages[name] - 1, 0);
    expect(contentPages).toBe(12 * 2 + 40);
  });
});
