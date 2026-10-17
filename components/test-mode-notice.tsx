export function TestModeNotice() {
  return (
    <div role="note" className="rounded-md border border-amber-800/40 bg-amber-50 p-4 text-amber-950">
      <p className="font-semibold">Test mode: no real payment is taken</p>
      <p className="mt-1">
        Payment runs in Stripe&apos;s test environment and no money moves. Pay with the test card 4242 4242 4242
        4242, any future expiry date and any three-digit CVC.
      </p>
    </div>
  );
}
