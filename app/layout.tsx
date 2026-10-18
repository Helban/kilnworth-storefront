import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { CART_COOKIE, countItems, parseCartCookie } from "@/lib/cart/cookie";
import { CATEGORY_LINKS } from "@/lib/categories";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Self-hosted by next/font at build time, so the pages load no third-party font files. Newsreader
// comes as the variable font because its optical-size axis is only available that way; the pages
// use its 400 and 500 weights.
const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], variable: "--font-newsreader" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-public-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
        {/* Sticky from desktop up only: on a phone the category links add a second row, and a header
            that tall would cover too much of the screen. */}
        <header className="border-b border-line bg-bg lg:sticky lg:top-0 lg:z-10">
          <div className="page-width flex flex-wrap items-center justify-between gap-x-8">
            <Link href="/" className="inline-flex min-h-16 items-center font-serif text-2xl font-medium">
              Kilnworth Studio
            </Link>
            <nav aria-label="Categories" className="order-last w-full pb-2 lg:order-none lg:w-auto lg:pb-0">
              <ul className="flex flex-wrap gap-x-5 lg:gap-x-8">
                {CATEGORY_LINKS.map((category) => (
                  <li key={category.href}>
                    <Link href={category.href} className="name-link inline-flex min-h-11 items-center">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Link href="/cart" className="text-link inline-flex min-h-11 items-center">
              Cart
              {/* No fade on the count: axe measured contrast mid-fade and failed the page. */}
              {itemCount > 0 && <span className="tabular-nums">&nbsp;({itemCount})</span>}
            </Link>
          </div>
        </header>
        <main className="page-width flex-1 py-8 sm:py-12">{children}</main>
        <footer className="border-t border-line">
          <div className="page-width grid gap-8 py-12 md:grid-cols-3 md:gap-12">
            <div>
              <p className="font-serif text-2xl font-medium">Kilnworth Studio</p>
              <p className="mt-3 text-ink-muted">
                Kilnworth Studio is a two-person pottery in Portland, Oregon. Everything here is thrown, glazed and
                fired in one room.
              </p>
            </div>
            <nav aria-label="Footer">
              <ul>
                {CATEGORY_LINKS.map((category) => (
                  <li key={category.href}>
                    <Link href={category.href} className="text-link inline-flex min-h-11 items-center">
                      {category.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/terms" className="text-link inline-flex min-h-11 items-center">
                    Terms of sale
                  </Link>
                </li>
              </ul>
            </nav>
            <p className="text-ink-muted">
              Kilnworth Studio is a fictional shop and this site is a demo. No real orders are taken.{" "}
              <a href="https://helban.dev" className="text-link">
                Built by helban.dev
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
