"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserApi } from "@/lib/api/client";
import { MAX_LINE_QUANTITY, type Cart, type CartLineBody } from "@/lib/api/contract";
import { formatPrice } from "@/lib/money";
import { describeFailure } from "./fetch-failure";
import { HoldCartButton } from "./hold-cart-button";

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
      <div className="mt-6">
        <p className="text-stone-600">Your cart is empty.</p>
        <Link href="/" className="mt-3 inline-block font-medium underline underline-offset-2">
          See the current batch
        </Link>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {cart.lines.map((line) => (
          <CartLineRow
            key={line.slug}
            line={line}
            busy={busySlug === line.slug}
            onQuantityChange={(quantity) => changeQuantity(line.slug, quantity)}
          />
        ))}
      </ul>
      {failure && (
        <p role="alert" className="mt-4 text-red-800">
          {failure}
        </p>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <dl className="mt-6 ml-auto max-w-xs space-y-2">
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
      <div className="mt-6 flex justify-end">
        <HoldCartButton label="Check out" />
      </div>
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
    <li className="flex gap-4 py-4">
      <Image
        src={line.image.src}
        width={line.image.width}
        height={line.image.height}
        alt=""
        className="size-20 shrink-0 bg-stone-100 object-cover"
      />
      <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
            {line.name}
          </Link>
          <p className="text-sm text-stone-600">{formatPrice(line.unitPriceCents)} each</p>
          {tooMany && (
            <p id={warningId} className="mt-1 text-sm font-medium text-red-800">
              {line.stockLeft === 0
                ? "Sold out. Remove it to check out."
                : `Only ${line.stockLeft} left. Lower the quantity to check out.`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={selectId} className="sr-only">
            Quantity of {line.name}
          </label>
          <select
            id={selectId}
            value={line.quantity}
            disabled={busy}
            aria-describedby={tooMany ? warningId : undefined}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
            className="rounded-md border border-stone-400 bg-white px-2 py-1 disabled:opacity-60"
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
            className="text-sm font-medium underline underline-offset-2 disabled:opacity-60"
          >
            Remove<span className="sr-only"> {line.name}</span>
          </button>
          <p className="w-20 text-right font-medium">{formatPrice(line.lineTotalCents)}</p>
        </div>
      </div>
    </li>
  );
}
