import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { CART_COOKIE, countItems, parseCartCookie } from "@/lib/cart/cookie";
import "./globals.css";

// Self-hosted by next/font at build time, so the pages load no third-party font files. Newsreader
// comes as the variable font because its optical-size axis is only available that way; the pages
// use its 400 and 500 weights.
const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], variable: "--font-newsreader" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-public-sans" });

export const metadata: Metadata = {
  title: { default: "Kilnworth Studio", template: "%s | Kilnworth Studio" },
  description: "Small-batch ceramics from Kilnworth Studio.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Counted from the cookie alone: the header does not need prices, so it skips the database.
  const itemCount = countItems(parseCartCookie((await cookies()).get(CART_COOKIE)?.value));
  return (
    <html lang="en" className={`${newsreader.variable} ${publicSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-base">
        <noscript>
          <style>{".photo-waiting { opacity: 1; }"}</style>
        </noscript>
        <header className="sticky top-0 z-10 border-b border-line bg-bg">
          <div className="page-width flex min-h-16 items-center justify-between gap-4">
            <Link href="/" className="font-serif text-2xl font-medium">
              Kilnworth Studio
            </Link>
            <Link href="/cart" className="text-link inline-flex min-h-11 items-center">
              Cart
              {/* No fade on the count: axe measured contrast mid-fade and failed the page. */}
              {itemCount > 0 && <span className="tabular-nums">&nbsp;({itemCount})</span>}
            </Link>
          </div>
        </header>
        <main className="page-width flex-1 py-8 sm:py-12">{children}</main>
        <footer className="border-t border-line">
          <p className="page-width py-8 text-ink-muted">
            Kilnworth Studio is a fictional shop and this site is a demo. No real orders are taken.{" "}
            <Link href="/terms" className="text-link">
              Terms of sale
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
