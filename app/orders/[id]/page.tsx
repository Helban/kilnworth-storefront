import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FetchFailure } from "@/components/fetch-failure";
import { OrderStatusPoller } from "@/components/order-status-poller";
import { OrderSummary } from "@/components/order-summary";
import type { Order } from "@/lib/api/contract";
import { getServerApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const api = await getServerApi();
  const lookup = await api.getOrder(id);

  if (!lookup.ok) {
    if (lookup.failure.kind === "http" && lookup.failure.status === 404) notFound();
    return <FetchFailure failure={lookup.failure} subject="your order" retryHref={`/orders/${id}`} />;
  }

  const { order } = lookup.data;
  return (
    <div className="max-w-2xl">
      <StatusMessage order={order} />
      <section aria-labelledby="summary-heading" className="mt-10">
        <h2 id="summary-heading" className="font-serif text-xl font-semibold">
          Order summary
        </h2>
        <div className="mt-4">
          <OrderSummary summary={order} />
        </div>
        <h3 className="mt-6 font-semibold">Shipping to</h3>
        <address className="mt-1 not-italic text-stone-700">
          {order.shippingAddress.name}
          <br />
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 && (
            <>
              <br />
              {order.shippingAddress.line2}
            </>
          )}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
        </address>
      </section>
    </div>
  );
}

function StatusMessage({ order }: { order: Order }) {
  switch (order.status) {
    case "pending_payment":
      return (
        <>
          <h1 className="font-serif text-3xl font-semibold">Waiting for payment confirmation</h1>
          <OrderStatusPoller orderId={order.id} />
        </>
      );
    case "paid":
      return (
        <>
          <h1 className="font-serif text-3xl font-semibold">Thank you, your order is confirmed</h1>
          <p className="mt-2 text-stone-600">
            Stripe confirmed the payment (in test mode). A real shop would email {order.email} now; this demo sends
            nothing and ships nothing.
          </p>
        </>
      );
    case "needs_review":
      return (
        <>
          <h1 className="font-serif text-3xl font-semibold">We need to check this order by hand</h1>
          <p className="mt-2 text-stone-600">
            The payment arrived, but the pieces were no longer held for this checkout, or the amount did not match.
            Someone at the studio would check the stock and either confirm the order or refund it in full.
          </p>
        </>
      );
    case "expired":
    case "superseded":
      return (
        <>
          <h1 className="font-serif text-3xl font-semibold">This checkout was not completed</h1>
          <p className="mt-2 text-stone-600">
            {order.status === "expired"
              ? "The payment page expired before payment, and the pieces went back on sale."
              : "You started checkout again after this one, so this attempt was replaced."}{" "}
            No payment was taken for it.
          </p>
          <Link href="/" className="mt-3 inline-block font-medium underline underline-offset-2">
            Back to the shop
          </Link>
        </>
      );
  }
}
