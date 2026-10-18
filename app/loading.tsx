// Static placeholders: the design allows only photo fades and the cart count to move.
export default function CatalogLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading the catalog</span>
      <div aria-hidden className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="h-14 w-72 max-w-full bg-line" />
          <div className="mt-6 h-6 w-full max-w-md bg-line" />
          <div className="mt-2 h-6 w-2/3 max-w-sm bg-line" />
        </div>
        <div className="aspect-square bg-line" />
      </div>
    </div>
  );
}
