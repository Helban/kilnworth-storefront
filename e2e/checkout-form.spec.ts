import { expect, test } from "@playwright/test";
import { addToCart, fillShippingDetails, startCheckout } from "./support";

test.beforeEach(async ({ page }) => {
  await addToCart(page, "ash-glaze-mug");
  await startCheckout(page);
});

test("an empty submit moves focus to the first field and links each error to its field", async ({ page }) => {
  await page.getByRole("button", { name: "Continue to payment" }).focus();
  await page.keyboard.press("Enter");

  const email = page.getByLabel("Email");
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription(/Enter an email address, like name@example.com\./);
  await expect(page.getByLabel("ZIP code")).toHaveAccessibleDescription("Enter a 5-digit ZIP code, like 97214.");
});

test("checkout does not continue without the terms, and the keyboard is enough to fix it", async ({ page }) => {
  await fillShippingDetails(page);
  await page.getByRole("button", { name: "Continue to payment" }).click();

  const terms = page.getByLabel(/I accept the/);
  await expect(terms).toBeFocused();
  await expect(terms).toHaveAccessibleDescription("Accept the terms of sale to continue.");
  await expect(page).toHaveURL(/\/checkout$/);

  await page.keyboard.press("Space");
  await expect(terms).toBeChecked();
});
