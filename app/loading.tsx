export default function CatalogLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading the catalog</span>
      <div aria-hidden className="motion-safe:animate-pulse">
        <div className="h-9 w-48 rounded bg-stone-200" />
        <div className="mt-3 h-5 w-full max-w-md rounded bg-stone-100" />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index}>
              <div className="aspect-square bg-stone-100" />
              <div className="mt-3 h-4 w-3/4 rounded bg-stone-100" />
              <div className="mt-2 h-4 w-1/3 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
