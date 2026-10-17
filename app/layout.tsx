import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { CART_COOKIE, countItems, parseCartCookie } from "@/lib/cart/cookie";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kilnworth Studio", template: "%s | Kilnworth Studio" },
  description: "Small-batch ceramics from Kilnworth Studio.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Counted from the cookie alone: the header does not need prices, so it skips the database.
  const itemCount = countItems(parseCartCookie((await cookies()).get(CART_COOKIE)?.value));
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-stone-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-serif text-xl font-semibold">
              Kilnworth Studio
            </Link>
            <Link href="/cart" className="font-medium underline-offset-2 hover:underline">
              Cart{itemCount > 0 && <span> ({itemCount})</span>}
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
        <footer className="border-t border-stone-200">
          <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-stone-600">
            Kilnworth Studio is a fictional shop and this site is a demo. No real orders are taken.
          </p>
        </footer>
      </body>
    </html>
  );
}
