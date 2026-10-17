import type { Cart } from "@/lib/api/contract";
import { formatPrice } from "@/lib/money";

export function OrderSummary({ cart }: { cart: Cart }) {
  return (
    <div>
      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {cart.lines.map((line) => (
          <li key={line.slug} className="flex justify-between gap-4 py-3">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span>{formatPrice(line.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPrice(cart.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping (US, flat rate)</dt>
          <dd>{formatPrice(cart.shippingCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(cart.totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
