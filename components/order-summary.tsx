import { formatPrice } from "@/lib/money";

// Fits both a cart and a placed order. Line names are unique within either, so they serve as keys.
interface Summary {
  lines: { name: string; quantity: number; lineTotalCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

export function OrderSummary({ summary }: { summary: Summary }) {
  return (
    <div>
      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {summary.lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-4 py-3">
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
          <dd>{formatPrice(summary.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping (US, flat rate)</dt>
          <dd>{formatPrice(summary.shippingCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(summary.totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
