import type { Metadata } from "next";
import Link from "next/link";
import { FetchFailure } from "@/components/fetch-failure";
import { HoldCartButton } from "@/components/hold-cart-button";
import { OrderSummary } from "@/components/order-summary";
import type { Hold } from "@/lib/api/contract";
import { getServerApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const api = await getServerApi();
  const loaded = await api.getCheckout();

  if (!loaded.ok) {
    return (
      <>
        <h1 className="font-serif text-3xl font-semibold">Checkout</h1>
        <div className="mt-6">
          <FetchFailure failure={loaded.failure} subject="your checkout" retryHref="/checkout" />
        </div>
      </>
    );
  }

  const { hold, cart } = loaded.data.checkout;
  if (cart.lines.length === 0) {
    return (
      <>
        <h1 className="font-serif text-3xl font-semibold">Checkout</h1>
        <p className="mt-6 text-stone-600">Your cart is empty, so there is nothing to check out.</p>
        <Link href="/" className="mt-3 inline-block font-medium underline underline-offset-2">
          See the current batch
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Checkout</h1>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="hold-heading">
          <h2 id="hold-heading" className="sr-only">
            Your hold
          </h2>
          <HoldStatus hold={hold} />
        </section>
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="font-serif text-xl font-semibold">
            Order summary
          </h2>
          <div className="mt-4">
            <OrderSummary cart={cart} />
          </div>
          <Link href="/cart" className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
            Change your cart
          </Link>
        </section>
      </div>
    </>
  );
}

function HoldStatus({ hold }: { hold: Hold }) {
  if (hold.status === "none") {
    return (
      <div className="rounded-md border border-stone-300 p-4">
        <p>
          These pieces are not held for you right now. The hold may have run out, or your cart changed
          since it was taken. Pieces are held for ten minutes while you check out.
        </p>
        <div className="mt-4">
          <HoldCartButton label="Hold my pieces and continue" />
        </div>
      </div>
    );
  }

  const minutesLeft = Math.max(1, Math.ceil(hold.secondsLeft / 60));
  return (
    <div className="rounded-md border border-stone-300 p-4">
      <p>
        These pieces are held for you for {minutesLeft} more {minutesLeft === 1 ? "minute" : "minutes"}.
        Nobody else can buy them in that time.
      </p>
      <p className="mt-3 text-stone-600">The address form and payment arrive in the next change.</p>
    </div>
  );
}
