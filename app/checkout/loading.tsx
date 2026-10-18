export default function CheckoutLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading checkout</span>
      <div aria-hidden>
        <div className="h-12 w-48 bg-line" />
        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
          <div className="h-96 bg-line" />
          <div className="h-48 bg-surface" />
        </div>
      </div>
    </div>
  );
}
