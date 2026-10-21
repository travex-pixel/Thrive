import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addFiles, fixture, generated } from "./helpers";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  return serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`);
}

/** Apple HIG: every tappable control at least 44×44 pt. Inline text links in sentences are exempt. */
async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll<HTMLElement>("button, a[href], select, input:not([type=hidden]), [role=switch], [role=radio], summary");
    for (const el of els) {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || el.closest("[aria-hidden=true]") || el.classList.contains("sr-only")) continue;
      if (el.tagName === "A" && el.closest("p, li > span, figcaption")) continue; // inline links in text
      if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "checkbox") continue; // measured via its 44pt label
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 43.5 || r.width < 43.5) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
}

test.describe("accessibility", () => {
  test("landing page: no serious axe violations, 44pt targets", async ({ page }) => {
    await page.goto("/");
    expect(await axe(page)).toEqual([]);
    expect(await smallTargets(page)).toEqual([]);
  });

  test("builder (all steps): no serious axe violations, 44pt targets", async ({ page }) => {
    await page.goto("/build");
    expect(await axe(page)).toEqual([]);
    await addFiles(page, [fixture("IMG_4821.JPG"), generated("Passport - Alex.pdf"), fixture("Screenshot 2025-01-09 at 21.14.03.png")]);
    expect(await axe(page)).toEqual([]);
    expect(await smallTargets(page)).toEqual([]);

    await page.getByRole("radio", { name: "2  Sort" }).click();
    expect(await axe(page)).toEqual([]);
    expect(await smallTargets(page)).toEqual([]);

    await page.getByRole("radio", { name: "3  Build" }).click();
    expect(await axe(page)).toEqual([]);
    expect(await smallTargets(page)).toEqual([]);

    // Details sheet
    await page.getByRole("radio", { name: "2  Sort" }).click();
    await page.getByRole("button", { name: /IMG 4821/ }).click();
    await expect(page.getByRole("dialog", { name: "File details" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("fix and legal pages: no serious axe violations", async ({ page }) => {
    for (const path of ["/fix", "/privacy", "/terms"]) {
      await page.goto(path);
      expect(await axe(page), path).toEqual([]);
    }
  });

  test("keyboard: can reach and operate the main actions", async ({ page }) => {
    await page.goto("/build");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    // Tab until the "Choose files" button is focused.
    for (let i = 0; i < 12; i++) {
      const name = await page.evaluate(() => document.activeElement?.textContent?.trim());
      if (name === "Choose files") break;
      await page.keyboard.press("Tab");
    }
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe("Choose files");
  });
});
