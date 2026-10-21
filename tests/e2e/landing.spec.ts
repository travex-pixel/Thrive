import { expect, test } from "@playwright/test";
import { watchErrors, watchExternalRequests } from "./helpers";

test.describe("landing page", () => {
  test("explains the offer and leads to the builder", async ({ page }) => {
    const errors = watchErrors(page);
    const external = watchExternalRequests(page);
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your partner visa evidence, ready for ImmiAccount.");
    await expect(page.getByText("A$29").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Is this immigration advice?" })).toHaveCount(0); // FAQ uses <summary>, not headings
    await page.getByText("Is this immigration advice?").click();
    await expect(page.getByText(/doesn’t tell you what evidence to\s+provide/)).toBeVisible();

    await page.getByRole("link", { name: "Build my pack, free" }).first().click();
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

  test("sends strict security headers", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();

    const app = await request.get("/build");
    expect(app.headers()["content-security-policy"]).toContain("connect-src 'self'");
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
