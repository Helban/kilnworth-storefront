import { expect, test } from "@playwright/test";
import { addToCart } from "./support";

test("the cart shows an honest error when the API answers in the wrong shape", async ({ page }) => {
  await addToCart(page, "oat-breakfast-bowl");
  await page.goto("/cart");
  await page.route("**/api/cart/lines/**", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ cart: { lines: "not a list" } }) }),
  );

  await page.getByLabel("Quantity of Oat breakfast bowl").selectOption("2");

  await expect(page.getByRole("alert").filter({ hasText: "not in the format this page expects" })).toBeVisible();
  // The cart on screen is left as it was rather than filled with whatever came back.
  await expect(page.getByLabel("Quantity of Oat breakfast bowl")).toHaveValue("1");
});
