export default function CartLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading your cart</span>
      <div aria-hidden>
        <div className="h-12 w-48 bg-line" />
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="mt-8 flex gap-6">
            <div className="size-20 bg-line" />
            <div className="flex-1">
              <div className="h-6 w-1/2 bg-line" />
              <div className="mt-2 h-6 w-1/4 bg-line" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
