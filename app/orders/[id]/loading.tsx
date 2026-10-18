export default function OrderLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading your order</span>
      <div aria-hidden className="max-w-3xl">
        <div className="h-14 w-3/4 bg-line" />
        <div className="mt-6 h-6 w-1/2 bg-line" />
        <div className="mt-12 h-40 bg-line" />
      </div>
    </div>
  );
}
