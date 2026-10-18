import { expect, test } from "@playwright/test";
import {
  addToCart,
  checkoutCompletedEvent,
  deliverWebhook,
  fillShippingDetails,
  interceptStripeCheckout,
  latestOrder,
  startCheckout,
} from "./support";

test("a shopper buys the moon jar and the webhook confirms the order", async ({ page, request }) => {
  await interceptStripeCheckout(page);
  await addToCart(page, "moon-jar");
  await startCheckout(page);
  await expect(page.getByRole("note")).toContainText("Test mode: no real payment is taken");
  await expect(page.getByText(/held for you for 10 more minutes/)).toBeVisible();

  await fillShippingDetails(page);
  await page.getByLabel(/I accept the/).check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL("https://checkout.stripe.com/**");

  // Back from Stripe: the order waits for the webhook, and the bought cart is gone.
  const order = latestOrder();
  await page.goto(`/checkout/complete?order=${order.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Waiting for payment confirmation");
  await expect(page.getByRole("link", { name: "Cart", exact: true })).toBeVisible();

  const event = checkoutCompletedEvent(order);
  expect(await deliverWebhook(request, event)).toMatchObject({ outcome: "paid" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thank you, your order is confirmed");

  expect(await deliverWebhook(request, event)).toMatchObject({ outcome: "duplicate" });
  await page.goto("/products/moon-jar");
  await expect(page.getByText("Sold out")).toBeVisible();
});

test("a second shopper cannot check out a piece someone else is holding", async ({ browser }) => {
  const firstShopper = await browser.newContext();
  const secondShopper = await browser.newContext();
  try {
    const first = await firstShopper.newPage();
    const second = await secondShopper.newPage();
    await addToCart(first, "ripple-platter");
    await addToCart(second, "ripple-platter");

    await startCheckout(first);
    await second.goto("/cart");
    await second.getByRole("button", { name: "Check out" }).click();

    await expect(second.getByText("Not enough left of: Ripple platter.", { exact: false })).toBeVisible();
    await second.goto("/products/ripple-platter");
    await expect(second.getByText("Sold out")).toBeVisible();
  } finally {
    await firstShopper.close();
    await secondShopper.close();
  }
});
