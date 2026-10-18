import { expect, test } from "@playwright/test";

test("a category link on another page opens the home page at that category", async ({ page }) => {
  await page.goto("/cart");

  await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: "Bowls" }).click();

  await page.waitForURL("**/#category-bowl");
  await expect(page.getByRole("heading", { level: 2, name: "Bowls" })).toBeInViewport();
  await expect(page.getByRole("heading", { level: 1, name: "Current batch" })).not.toBeInViewport();
});
