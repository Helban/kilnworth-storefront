"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useId } from "react";
import { MAX_LINE_QUANTITY } from "@/lib/api/contract";
import { browserApi } from "@/lib/api/client";
import { describeFailure } from "./fetch-failure";

type AddState = { kind: "idle" } | { kind: "added" } | { kind: "failed"; message: string };

export function AddToCart({ slug, stockLeft }: { slug: string; stockLeft: number }) {
  const router = useRouter();
  const quantityId = useId();
  const [state, addToCart, adding] = useActionState<AddState, FormData>(
    async (_previous, form) => {
      const added = await browserApi.addToCart(slug, Number(form.get("quantity")));
      if (!added.ok) return { kind: "failed", message: describeFailure(added.failure) };
      // Re-render the server components so the header's cart count catches up.
      router.refresh();
      return { kind: "added" };
    },
    { kind: "idle" },
  );

  if (stockLeft === 0) return null;

  const choices = Array.from({ length: Math.min(stockLeft, MAX_LINE_QUANTITY) }, (_, index) => index + 1);
  return (
    <form action={addToCart} className="mt-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-24">
          <label htmlFor={quantityId} className="block font-semibold">
            Quantity
          </label>
          <select id={quantityId} name="quantity" defaultValue="1" className="field mt-2">
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={adding} className="button-primary">
          {adding ? "Adding…" : "Add to cart"}
        </button>
      </div>
      <p role="status" className="mt-4 min-h-6">
        {state.kind === "added" && (
          <>
            <span className="text-glaze">Added to your cart.</span>{" "}
            <Link href="/cart" className="text-link">
              View cart
            </Link>
          </>
        )}
      </p>
      {state.kind === "failed" && (
        <p role="alert" className="text-error">
          {state.message}
        </p>
      )}
    </form>
  );
}
