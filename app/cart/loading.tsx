export default function CartLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading your cart</span>
      <div aria-hidden className="motion-safe:animate-pulse">
        <div className="h-9 w-40 rounded bg-stone-200" />
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="mt-6 flex gap-4">
            <div className="size-20 bg-stone-100" />
            <div className="flex-1">
              <div className="h-4 w-1/2 rounded bg-stone-100" />
              <div className="mt-2 h-4 w-1/4 rounded bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
