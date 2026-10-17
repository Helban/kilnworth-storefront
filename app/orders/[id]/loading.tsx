export default function OrderLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading your order</span>
      <div aria-hidden className="max-w-2xl motion-safe:animate-pulse">
        <div className="h-9 w-3/4 rounded bg-stone-200" />
        <div className="mt-4 h-4 w-1/2 rounded bg-stone-100" />
        <div className="mt-10 h-40 rounded bg-stone-100" />
      </div>
    </div>
  );
}
