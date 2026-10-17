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
    <form action={addToCart} className="mt-6">
      <div className="flex items-end gap-3">
        <div>
          <label htmlFor={quantityId} className="block text-sm font-medium">
            Quantity
          </label>
          <select
            id={quantityId}
            name="quantity"
            defaultValue="1"
            className="mt-1 rounded-md border border-stone-400 bg-white px-3 py-2"
          >
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-orange-800 px-5 py-2 font-medium text-white hover:bg-orange-900 disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add to cart"}
        </button>
      </div>
      <p role="status" className="mt-3 min-h-6">
        {state.kind === "added" && (
          <>
            Added to your cart.{" "}
            <Link href="/cart" className="font-medium underline underline-offset-2">
              View cart
            </Link>
          </>
        )}
      </p>
      {state.kind === "failed" && (
        <p role="alert" className="text-red-800">
          {state.message}
        </p>
      )}
    </form>
  );
}
