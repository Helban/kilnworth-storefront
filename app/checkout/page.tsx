import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { FetchFailure } from "@/components/fetch-failure";
import { HoldCartButton } from "@/components/hold-cart-button";
import { OrderSummary } from "@/components/order-summary";
import { TestModeNotice } from "@/components/test-mode-notice";
import type { Hold } from "@/lib/api/contract";
import { getServerApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const api = await getServerApi();
  const loaded = await api.getCheckout();

  if (!loaded.ok) {
    return (
      <>
        <h1 className="text-4xl sm:text-5xl">Checkout</h1>
        <div className="mt-8">
          <FetchFailure failure={loaded.failure} subject="your checkout" retryHref="/checkout" />
        </div>
      </>
    );
  }

  const { hold, cart } = loaded.data.checkout;
  if (cart.lines.length === 0) {
    return (
      <>
        <h1 className="text-4xl sm:text-5xl">Checkout</h1>
        <p className="mt-8 text-ink-muted">Your cart is empty, so there is nothing to check out.</p>
        <Link href="/" className="text-link mt-4 inline-block">
          See the current batch
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      <div className="mt-6 space-y-2">
        <HoldStatus hold={hold} />
        <TestModeNotice />
      </div>
      {/* The summary comes first in the page so a phone shows what is being bought before the form;
          on desktop it moves to the right-hand column. */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
        <section aria-labelledby="summary-heading" className="bg-surface p-6 lg:col-start-2 lg:row-start-1 lg:self-start">
          <h2 id="summary-heading" className="text-2xl">
            Order summary
          </h2>
          <div className="mt-4">
            <OrderSummary summary={cart} />
          </div>
          <Link href="/cart" className="text-link mt-6 inline-block">
            Change your cart
          </Link>
        </section>
        <section aria-labelledby="details-heading" className="lg:col-start-1 lg:row-start-1">
          <h2 id="details-heading" className="sr-only">
            Your details
          </h2>
          {hold.status === "held" ? <CheckoutForm /> : <HoldCartButton label="Hold my pieces and continue" />}
        </section>
      </div>
    </>
  );
}

// One calm line either way: the hold is a reassurance, not an alarm.
function HoldStatus({ hold }: { hold: Hold }) {
  if (hold.status === "none") {
    return (
      <p className="text-ink-muted">Not held right now: the ten-minute hold ran out or the cart changed.</p>
    );
  }
  const minutesLeft = Math.max(1, Math.ceil(hold.secondsLeft / 60));
  return (
    <p className="text-ink-muted">
      These pieces are held for you for {minutesLeft} more {minutesLeft === 1 ? "minute" : "minutes"}.
    </p>
  );
}
