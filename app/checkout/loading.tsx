export default function CheckoutLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading checkout</span>
      <div aria-hidden className="motion-safe:animate-pulse">
        <div className="h-9 w-40 rounded bg-stone-200" />
        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div className="h-32 rounded bg-stone-100" />
          <div className="h-48 rounded bg-stone-100" />
        </div>
      </div>
    </div>
  );
}
