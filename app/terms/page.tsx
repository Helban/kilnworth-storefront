import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of sale" };

export default function TermsPage() {
  return (
    <article className="max-w-[65ch] space-y-4 text-lg leading-relaxed">
      <h1 className="text-4xl sm:text-5xl">Terms of sale</h1>
      <p>
        Kilnworth Studio is a fictional shop. This site is a demo, and payments run in Stripe&apos;s test mode, so
        no money is taken and nothing is shipped. These terms exist because checkout asks for your consent the way
        a real shop has to, and the consent is recorded with your order.
      </p>
      <h2 className="pt-4 text-2xl">Orders</h2>
      <p>
        Pieces are handmade in small numbers. When you start checkout we hold your pieces for ten minutes, and for
        as long as the payment page stays open. An order is confirmed only once the payment provider confirms the
        payment.
      </p>
      <h2 className="pt-4 text-2xl">Shipping</h2>
      <p>We ship to addresses in the United States for a flat $9.00 per order.</p>
      <h2 className="pt-4 text-2xl">Returns</h2>
      <p>
        A real shop would state its return window and who pays return shipping here. This demo does not ship, so
        there is nothing to return.
      </p>
    </article>
  );
}
