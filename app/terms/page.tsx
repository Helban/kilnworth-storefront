import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of sale" };

export default function TermsPage() {
  return (
    <article className="max-w-[65ch] space-y-4 text-lg leading-relaxed">
      <h1 className="text-4xl sm:text-5xl">Terms of sale</h1>
      <p role="note" className="border border-line bg-surface p-4 text-base text-clay">
        Kilnworth Studio is a demo shop. Payments run in Stripe test mode, so no money is taken, and no order is
        shipped.
      </p>
      <h2 className="pt-4 text-2xl">Orders</h2>
      <p>
        Every piece is made by hand in small numbers. When you start checkout we hold your pieces for ten minutes,
        and for as long as the payment page stays open. Your order is confirmed once the payment goes through. The
        time you accepted these terms is saved with the order.
      </p>
      <h2 className="pt-4 text-2xl">Shipping</h2>
      <p>
        We ship to addresses in the United States for a flat $9.00 per order. Pieces are wrapped by hand and leave
        the studio within three business days of payment. You get a tracking number by email when the parcel goes
        out.
      </p>
      <h2 className="pt-4 text-2xl">Breakage in transit</h2>
      <p>
        If a piece arrives broken, email us a photo within seven days of delivery. We send a replacement if one is
        left from the same firing. If not, we refund the piece and the shipping you paid for it.
      </p>
      <h2 className="pt-4 text-2xl">Returns</h2>
      <p>
        You can return unused pieces within 30 days of delivery. You pay for return shipping unless the piece
        arrived damaged. We refund the price of the piece within five business days of getting it back. The
        original $9.00 shipping is not refunded.
      </p>
      <p>
        One-of-a-kind pieces follow the same rules. Since there is no second one to exchange it for, we refund it.
      </p>
    </article>
  );
}
