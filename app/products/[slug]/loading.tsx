export default function ProductLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading the product</span>
      <div aria-hidden className="grid gap-8 motion-safe:animate-pulse md:grid-cols-2">
        <div className="aspect-square bg-stone-100" />
        <div>
          <div className="h-9 w-2/3 rounded bg-stone-200" />
          <div className="mt-4 h-6 w-24 rounded bg-stone-100" />
          <div className="mt-8 h-4 w-full rounded bg-stone-100" />
          <div className="mt-2 h-4 w-5/6 rounded bg-stone-100" />
        </div>
      </div>
    </div>
  );
}
