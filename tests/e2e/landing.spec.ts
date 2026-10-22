import { expect, test } from "@playwright/test";
import { fixture, watchErrors, watchExternalRequests } from "./helpers";

test.describe("landing page", () => {
  test("explains the offer and leads to the builder", async ({ page }) => {
    const errors = watchErrors(page);
    const external = watchExternalRequests(page);
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your partner visa evidence, sized and sorted for ImmiAccount.");
    await expect(page.getByText("A$29").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Is this immigration advice?" })).toHaveCount(0); // FAQ uses <summary>, not headings
    await page.getByText("Is this immigration advice?").click();
    await expect(page.getByText(/doesn’t tell you what evidence to\s+provide/)).toBeVisible();

    await page.getByRole("link", { name: "Try it free" }).first().click();
    await expect(page).toHaveURL(/\/build$/);
    await expect(page.getByRole("heading", { name: "Add your evidence" })).toBeVisible();

    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });

  test("has no horizontal scroll and readable text sizes", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const bodySize = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    expect(bodySize).toBeGreaterThanOrEqual(17);
  });

  test("sends one strict security policy on every page", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();

    // A browser keeps the first page's policy when moving between pages, so every page must allow what the
    // builder needs (the HEIC decoder) and nothing more.
    for (const path of ["/build", "/fix", "/privacy"]) {
      expect((await request.get(path)).headers()["content-security-policy"], path).toBe(csp);
    }
  });

  test("HEIC photos convert after arriving from the home page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Fix one file" }).first().click();
    await expect(page).toHaveURL(/\/fix$/);
    await page.getByTestId("fix-input").setInputFiles(fixture("IMG_5530.HEIC"));
    await expect(page.getByRole("heading", { name: /^Done: under 5\sMB/ })).toBeVisible({ timeout: 60_000 });
  });

  test("legal pages and 404 render", async ({ page }) => {
    for (const path of ["/privacy", "/terms", "/fix"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    const missing = await page.goto("/does-not-exist");
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page doesn’t exist" })).toBeVisible();
  });
});
