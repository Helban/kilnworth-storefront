import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="text-4xl">Not found</h1>
      <p className="mt-4 text-ink-muted">There is nothing at this address. The piece may have been removed.</p>
      <Link href="/" className="text-link mt-6 inline-block">
        Back to the shop
      </Link>
    </>
  );
}
