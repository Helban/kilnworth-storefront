export default function ProductLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading the product</span>
      <div aria-hidden className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-square bg-line" />
        <div>
          <div className="h-12 w-2/3 bg-line" />
          <div className="mt-4 h-8 w-24 bg-line" />
          <div className="mt-8 h-11 w-48 bg-line" />
        </div>
      </div>
    </div>
  );
}
