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
    <div className="max-w-3xl">
      <StatusMessage order={order} />
      <section aria-labelledby="summary-heading" className="mt-12">
        <h2 id="summary-heading" className="text-2xl">
          Order summary
        </h2>
        <div className="mt-4">
          <OrderSummary summary={order} />
        </div>
      </section>
      <section aria-labelledby="address-heading" className="mt-10">
        <h2 id="address-heading" className="text-2xl">
          Shipping to
        </h2>
        <address className="mt-4 not-italic leading-relaxed">
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

// The status comes first and big; the details follow.
function StatusMessage({ order }: { order: Order }) {
  switch (order.status) {
    case "pending_payment":
      return (
        <>
          <h1 className="text-4xl sm:text-5xl">Waiting for payment confirmation</h1>
          <OrderStatusPoller orderId={order.id} />
        </>
      );
    case "paid":
      return (
        <>
          <h1 className="text-4xl sm:text-5xl">Thank you, your order is confirmed</h1>
          <p className="mt-4 text-2xl text-glaze">Paid</p>
          <p className="mt-4 max-w-[65ch] text-ink-muted">
            Stripe confirmed the payment (in test mode). A real shop would email {order.email} now; this demo sends
            nothing and ships nothing.
          </p>
        </>
      );
    case "needs_review":
      return (
        <>
          <h1 className="text-4xl sm:text-5xl">We need to check this order by hand</h1>
          <p className="mt-4 text-2xl text-clay">Paid, needs review</p>
          <p className="mt-4 max-w-[65ch] text-ink-muted">
            The payment arrived, but the pieces were no longer held for this checkout, or the amount did not match.
            Someone at the studio would check the stock and either confirm the order or refund it in full.
          </p>
        </>
      );
    case "expired":
    case "superseded":
      return (
        <>
          <h1 className="text-4xl sm:text-5xl">This checkout was not completed</h1>
          <p className="mt-4 max-w-[65ch] text-ink-muted">
            {order.status === "expired"
              ? "The payment page expired before payment, and the pieces went back on sale."
              : "You started checkout again after this one, so this attempt was replaced."}{" "}
            No payment was taken for it.
          </p>
          <Link href="/" className="text-link mt-6 inline-block">
            Back to the shop
          </Link>
        </>
      );
  }
}
