import { expect, test } from "@playwright/test";

test("the thumbnails switch the product photo between the whole piece and the glaze", async ({ page }) => {
  await page.goto("/products/tenmoku-ramen-bowl");
  const wholePiece = page.getByRole("button", { name: "Show the whole piece" });
  const glaze = page.getByRole("button", { name: "Show the glaze up close" });
  await expect(wholePiece).toHaveAttribute("aria-pressed", "true");
  await expect(glaze).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("img", { name: "Tenmoku ramen bowl", exact: true })).toHaveAttribute(
    "src",
    "/products/tenmoku-ramen-bowl.webp",
  );

  await glaze.click();
  await expect(glaze).toHaveAttribute("aria-pressed", "true");
  await expect(wholePiece).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("img", { name: "Tenmoku ramen bowl, glaze up close" })).toHaveAttribute(
    "src",
    "/products/tenmoku-ramen-bowl-detail.webp",
  );

  await wholePiece.focus();
  await page.keyboard.press("Space");
  await expect(wholePiece).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: "Tenmoku ramen bowl", exact: true })).toBeVisible();
});
