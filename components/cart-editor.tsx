"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserApi } from "@/lib/api/client";
import { MAX_LINE_QUANTITY, type Cart, type CartLineBody } from "@/lib/api/contract";
import { formatPrice } from "@/lib/money";
import { describeFailure } from "./fetch-failure";
import { HoldCartButton } from "./hold-cart-button";
import { Totals } from "./order-summary";
import { ProductPhoto } from "./product-photo";

export function CartEditor({ initialCart }: { initialCart: Cart }) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  async function changeQuantity(slug: string, quantity: number) {
    setBusySlug(slug);
    setFailure(null);
    const updated = await browserApi.setCartQuantity(slug, quantity);
    setBusySlug(null);
    if (!updated.ok) {
      setFailure(describeFailure(updated.failure));
      return;
    }
    setCart(updated.data.cart);
    setAnnouncement(quantity === 0 ? "Removed from your cart." : "Cart updated.");
    router.refresh();
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mt-8">
        <p className="text-ink-muted">Your cart is empty.</p>
        <Link href="/" className="text-link mt-4 inline-block">
          See the current batch
        </Link>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
      <div>
        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((line) => (
            <CartLineRow
              key={line.slug}
              line={line}
              busy={busySlug === line.slug}
              onQuantityChange={(quantity) => void changeQuantity(line.slug, quantity)}
            />
          ))}
        </ul>
        {failure && (
          <p role="alert" className="mt-4 text-error">
            {failure}
          </p>
        )}
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
      <section aria-labelledby="totals-heading" className="lg:self-start">
        <h2 id="totals-heading" className="sr-only">
          Totals
        </h2>
        <Totals summary={cart} />
        <div className="mt-6">
          <HoldCartButton label="Check out" />
        </div>
      </section>
    </div>
  );
}

interface CartLineRowProps {
  line: CartLineBody;
  busy: boolean;
  onQuantityChange: (quantity: number) => void;
}

function CartLineRow({ line, busy, onQuantityChange }: CartLineRowProps) {
  const selectId = `quantity-${line.slug}`;
  const warningId = `stock-warning-${line.slug}`;
  const tooMany = line.quantity > line.stockLeft;
  const highestChoice = Math.min(MAX_LINE_QUANTITY, Math.max(line.stockLeft, line.quantity));
  const choices = Array.from({ length: highestChoice }, (_, index) => index + 1);

  return (
    <li className="flex gap-4 py-6 sm:gap-6">
      <div className="w-20 shrink-0">
        <ProductPhoto image={line.image} alt="" layout="thumb" />
      </div>
      <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/products/${line.slug}`} className="name-link font-serif text-xl">
            {line.name}
          </Link>
          <p className="mt-1 text-ink-muted tabular-nums">{formatPrice(line.unitPriceCents)} each</p>
          {tooMany && (
            <p id={warningId} className="mt-2 text-error">
              {line.stockLeft === 0
                ? "Sold out. Remove it to check out."
                : `Only ${line.stockLeft} left. Lower the quantity to check out.`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor={selectId} className="sr-only">
            Quantity of {line.name}
          </label>
          <select
            id={selectId}
            value={line.quantity}
            disabled={busy}
            aria-describedby={tooMany ? warningId : undefined}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
            className="field w-20 px-2 disabled:opacity-60"
          >
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => onQuantityChange(0)}
            className="text-link min-h-11 disabled:opacity-60"
          >
            Remove<span className="sr-only"> {line.name}</span>
          </button>
          <p className="w-24 text-right font-semibold tabular-nums">{formatPrice(line.lineTotalCents)}</p>
        </div>
      </div>
    </li>
  );
}
