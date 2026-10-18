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
      <ul className="divide-y divide-line border-y border-line">
        {summary.lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-4 py-4">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span className="tabular-nums">{formatPrice(line.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <Totals summary={summary} />
    </div>
  );
}

export function Totals({ summary }: { summary: Omit<Summary, "lines"> }) {
  return (
    <dl className="mt-4 space-y-2 tabular-nums">
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd>{formatPrice(summary.subtotalCents)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Shipping (US, flat rate)</dt>
        <dd>{formatPrice(summary.shippingCents)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-line pt-2 font-semibold">
        <dt>Total</dt>
        <dd>{formatPrice(summary.totalCents)}</dd>
      </div>
    </dl>
  );
}
