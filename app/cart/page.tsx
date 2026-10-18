import type { Metadata } from "next";
import { CartEditor } from "@/components/cart-editor";
import { FetchFailure } from "@/components/fetch-failure";
import { getServerApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const api = await getServerApi();
  const loaded = await api.getCart();

  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Your cart</h1>
      {loaded.ok ? (
        <CartEditor initialCart={loaded.data.cart} />
      ) : (
        <div className="mt-8">
          <FetchFailure failure={loaded.failure} subject="your cart" retryHref="/cart" />
        </div>
      )}
    </>
  );
}
