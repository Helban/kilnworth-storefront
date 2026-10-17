import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="font-serif text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-stone-600">There is nothing at this address. The piece may have been removed.</p>
      <Link href="/" className="mt-4 inline-block font-medium underline underline-offset-2">
        Back to the shop
      </Link>
    </>
  );
}
