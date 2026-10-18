// Kept to one short line. Stripe's test page accepts any future expiry date and any CVC with it.
export function TestModeNotice() {
  return (
    <p role="note" className="text-clay">
      Test mode: no real payment is taken. Test card 4242 4242 4242 4242.
    </p>
  );
}
