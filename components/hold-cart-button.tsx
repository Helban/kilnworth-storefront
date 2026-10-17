"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserApi } from "@/lib/api/client";
import { describeFailure } from "./fetch-failure";

// Holds the cart's pieces for ten minutes, then goes to /checkout. Holding is a POST from a click,
// never a side effect of rendering a page, so prefetching /checkout cannot take stock.
export function HoldCartButton({ label }: { label: string }) {
  const router = useRouter();
  const [holding, setHolding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function hold() {
    setHolding(true);
    setFailure(null);
    const held = await browserApi.holdCart();
    if (!held.ok) {
      setHolding(false);
      setFailure(describeFailure(held.failure));
      return;
    }
    router.push("/checkout");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={hold}
        disabled={holding}
        className="rounded-md bg-orange-800 px-5 py-3 font-medium text-white hover:bg-orange-900 disabled:opacity-60"
      >
        {holding ? "Holding your pieces…" : label}
      </button>
      {failure && (
        <p role="alert" className="mt-3 text-red-800">
          {failure}
        </p>
      )}
    </div>
  );
}
