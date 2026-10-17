import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kilnworth Studio", template: "%s | Kilnworth Studio" },
  description: "Small-batch ceramics from Kilnworth Studio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-stone-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-serif text-xl font-semibold">
              Kilnworth Studio
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
