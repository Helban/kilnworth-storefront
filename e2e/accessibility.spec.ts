import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addToCart, startCheckout } from "./support";

const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violationsOn(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  return violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}

test("the pages a shopper goes through have no WCAG 2.1 AA violations axe can detect", async ({ page }) => {
  await page.goto("/");
  expect(await violationsOn(page)).toEqual([]);

  await addToCart(page, "slate-bud-vase");
  expect(await violationsOn(page)).toEqual([]);

  await page.goto("/cart");
  expect(await violationsOn(page)).toEqual([]);

  await startCheckout(page);
  expect(await violationsOn(page)).toEqual([]);

  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByLabel("Email")).toBeFocused();
  expect(await violationsOn(page)).toEqual([]);
});
