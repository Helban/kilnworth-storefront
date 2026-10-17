# Handover notes

Written for whoever picks this up next. It records what was built, what was checked and how, and
what was not checked. Everything here was done on 2026-10-17 in a Linux container with Node
22.22.0 and npm 10.9.4.

## Status

Every item in the brief's scope is built. Nothing has been deployed.

| Area | State |
| --- | --- |
| Platform check (Next.js, OpenNext, D1) | Done |
| Catalog, own API, typed client, contract error case | Done |
| Cart in a cookie, priced on the server | Done |
| Stock holds at checkout, race test, expiry | Done |
| Checkout form, terms consent (422), orders, Stripe handoff | Done |
| Stripe webhook with signature check and idempotency, confirmation page | Done |
| README, Playwright tests | Done |

Definition of done, as last run on the final branch:

| Check | Result |
| --- | --- |
| `npm run lint` | Clean |
| `npm run typecheck` | Clean |
| `npm test` | 86 tests in 15 files pass |
| `npm run test:e2e` | 6 tests pass (Chromium, against the OpenNext build in workerd) |
| `npm audit` | 5 high findings in one dev-only chain, explained below; `npm audit --omit=dev` finds 0 |

## Platform check

Versions, taken from npm on the day and pinned exactly in `package.json`:

- `next` 16.4.2 (npm `latest`)
- `@opennextjs/cloudflare` 1.20.12 (npm `latest`; its peer range is `>=16.4.1` for Next 16)
- `wrangler` 4.151.1, which ships `workerd` 1.20261012.1
- `react` / `react-dom` 19.3.1
- `typescript` 5.9.3. npm `latest` is 7.0.2, the Go rewrite. `create-next-app@16.4.2` still
  writes `^5`, so I stayed on the newest 5.x rather than test Next's type-check step against 7.
- `eslint` 10.13.0. `create-next-app` writes `^9`, but npm marks 9.x as unsupported, and
  `eslint-config-next` 16.4.2 lints cleanly on 10.

What was run first, with a D1 binding named `DB` in local mode:

1. `next dev`: `GET /api/health` runs `SELECT 1` against D1 through `getCloudflareContext()` and
   returns 200.
2. `next dev` and `wrangler d1 execute DB --local` share one database. A table created with
   wrangler showed up in a query from the dev server, and disappeared again after a `DROP`.
3. `next build` passes.
4. `opennextjs-cloudflare build` passes.
5. `opennextjs-cloudflare preview` (the built worker running in workerd): `/` and `/api/health`
   return 200, and the health route reads D1.

The combination works. No platform or database change was needed.

### Cache Components are off

`create-next-app@16.4.2` turns on `cacheComponents` and `partialPrefetching` by default. I tried
that on workerd with a temporary page that streams a D1 query inside `<Suspense>`:

- With the adapter's default `dummy` incremental cache, every page, including the static `/`, hung
  until workerd cancelled the request ("Worker's code had hung"). The route handler still worked.
- With the `static-assets` incremental cache, the pages rendered and streamed. But workerd logged
  a warning from Next.js itself: "Next.js cannot guarantee that Cache Components will run as
  expected due to the current runtime's implementation of `setTimeout()`."
- With `cacheComponents` off, both caches worked and the warning was gone.

Every page here reads live stock, so the static shell Cache Components would produce is small. I
turned it off rather than ship on a mode the framework warns about on this runtime.
`partialPrefetching` requires it, so that is off too. The static-assets incremental cache stays,
because there is no ISR and it needs no KV or R2 bucket.

Under Cache Components, `getCloudflareContext()` also failed the build prerender with "encountered
the unstable value `new Date()`"; `await io()` before it fixed that. This matters only if someone
turns Cache Components back on.

## Local development pitfalls

These cost the most time. All three are about wrangler's local runtime living inside a project
that Turbopack watches.

The local D1 database lives in `.next/cache/wrangler-state`, not wrangler's default
`.wrangler/state`. `next.config.ts`, `npm run db:migrate` and `npm run preview` all point there.
`next build` leaves `.next/cache` alone (checked); deleting `.next` deletes the local database, so
run `npm run db:migrate` again afterwards. With the default location, an open browser tab on
`next dev` reloaded itself several times a second (52 navigations in 6 seconds with an idle
Chromium tab). Every D1 query creates or touches SQLite `-wal` and `-shm` files, Turbopack reacts
to new files in the project tree, and each rebuild reloaded the page, which queried D1 again.
Turbopack has no setting to ignore a directory, but it ignores its own `.next`. With the state
there, 30 API requests with a tab open caused 0 recompiles. My first attempt, `node_modules/.cache`,
passed a short test and failed a longer one.

`initOpenNextCloudflareForDev()` starts the local runtime asynchronously. If a request reaches
`getCloudflareContext({ async: true })` before it has finished, the adapter starts a second
runtime of its own, without the options given to the first, so with wrangler's default directory
and an empty database. Whichever finished last served all later requests: either "no such table:
products" or the reload loop, depending on timing. `next.config.ts` now exports an async config
that awaits the initialisation, in the dev-server phase only. Afterwards both workerd processes
that `next dev` starts open `.next/cache/wrangler-state` (checked in `/proc/<pid>/fd`).

`npm run preview` still writes into `.wrangler/` inside the project: wrangler's bundles go to
`.wrangler/tmp`, and OpenNext's preview reads the environment through a second local runtime that
uses `.wrangler/state` (both checked). Do not run `npm run preview` while a `next dev` tab is
open. I saw the reload loop once more after adding the security headers, at a point where a
preview and the dev server may have overlapped. I could not reproduce it afterwards: dev started
after `next build`, after a preview, and straight after the e2e suite all showed no loop and no
recompiles. If it comes back, look for leftover `wrangler` or `workerd` processes and for files
changing outside `.next`.

## Catalog

Products live in D1 (`migrations/0001_create_products.sql`). The 13 seed products are a migration
too (`0002_seed_products.sql`), so `wrangler d1 migrations apply --remote` seeds a real database
the same way. Change the catalog with a new migration, not by editing 0002.

`lib/store` holds the SQL and knows nothing about Next.js. Route handlers under `app/api/` turn
store records into the JSON contract in `lib/api/contract.ts`. The UI reads only through
`lib/api/client.ts`, which checks every response against that contract with zod and returns
failures as values (`network`, `http` or `contract`) that the page has to render. A response in
the wrong shape is logged with the offending fields and shown to the shopper as "not in the format
this page expects", never rendered. Covered in `lib/api/client.test.ts`,
`components/fetch-failure.test.tsx` and `e2e/contract.spec.ts`.

### Server components and the API

The brief asks for the UI to fetch through one typed client against our own route handlers, while
the catalog and product pages are server components. The Next.js docs say the opposite for server
components: "Fetch data in Server Components directly from its source, not via Route Handlers"
(`node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`). Over HTTP it would also
not work cleanly here: a Worker cannot fetch its own public URL, and the `WORKER_SELF_REFERENCE`
binding that OpenNext provides throws under `next dev` (checked).

`lib/api/server.ts` therefore builds the same client with a transport that calls the route handler
functions directly instead of going over the network. The response still goes through
`Response.json()`, `.json()` and the zod contract, so a server component sees exactly what the
browser would. The cost is a hand-written table of five GET routes. If it grows past a handful,
server components should call `lib/store` directly. That is an open question for the brief's owner.

### Unknown product URLs answer 200, not 404

`/products/<unknown>` renders the not-found page with `<meta name="robots" content="noindex">`,
but the status is 200. The product page has a loading state, so Next.js has already started
streaming when the page calls `notFound()`. Checked under `next dev` and in the workerd preview,
with a browser and a Googlebot user agent: both get 200. The API answers a real 404. Getting a 404
page status would mean dropping the loading state for that route, which the brief asks for.

### Images

One 800x800 WebP per product in `public/products/<slug>.webp`, generated with ImageMagick as flat
placeholders. Real photos at the same size and file name replace them with no code change.
`images.unoptimized` is set because no resizing service is bound (that would be the Cloudflare
Images binding). The product page shows the image at up to 480 CSS pixels, so 800 is close to 2x.
Catalog tiles (about 250 CSS pixels) and cart thumbnails (80) download more than they show. With
the placeholders that is about 3 KB each. With real photos, bind Cloudflare Images or export a
smaller size.

## Cart

The cart is a cookie named `cart` holding slugs and quantities only: `HttpOnly`, `Secure`,
`SameSite=Lax`, 30 days. It is parsed with zod on every read, and anything malformed counts as an
empty cart. Prices never come from the client: `GET /api/cart` prices each line from D1 through
`priceCart` (`lib/cart/pricing.ts`), so a price change shows on the next read and a price written
into the cookie by hand is dropped (both tested).

Adding to the cart checks the quantity against the stock left and answers 409 with a message the
shopper can act on ("Only 3 left, and your cart already has 2."). That is a courtesy; nothing is
held until checkout. A shopper's own hold counts as available to them, otherwise the piece they
are holding would read as sold out in their own cart.

Cart writes refuse a non-JSON body (415) and an `Origin` that does not match the host (403).
Together with `SameSite=Lax` that covers CSRF without a token. A request without `Origin` is
allowed, because browsers always send it on cross-origin POST and PUT.

Shipping is a flat $9.00 for any US address. No sales tax, no free-shipping threshold.

## Reservations

"Check out" in the cart sends `POST /api/checkout/reservation`, which holds every line of the cart
for ten minutes, or none of them. The reservation id goes into an `HttpOnly` cookie named
`checkout`. Holding is a POST from a click, never a side effect of rendering `/checkout`, so a
prefetch cannot take stock. Asking again while the hold still covers the cart returns the same
hold without extending it.

How the race is prevented (`lib/store/reservations.ts`): one D1 batch, which D1 runs as a single
transaction. It inserts the reservation row, then for each line:

1. `UPDATE products SET reserved = reserved + :qty WHERE slug = :slug AND available - reserved >= :qty`
2. `INSERT INTO reservation_lines ... SELECT ... WHERE changes() = 1`

The check and the write are one statement, so there is no gap between reading stock and taking
it. The line row exists only if its UPDATE changed a row, so releasing a hold can never return
stock that was not taken. If any line comes up short, the lines that succeeded are released
straight away and the shopper gets a 409 naming the short pieces. `CHECK (reserved <= available)`
on `products` is a second backstop.

`lib/store/reservations.test.ts` fires ten concurrent `reserveStock` calls at the moon jar (stock
1): exactly one succeeds, `reserved` ends at 1, and there is one line row. The test database
yields to the event loop before every statement, so a read-then-write version would interleave and
fail; with the `>= qty` condition removed, the test does fail (checked by hand).
`lib/store/reservations.d1.test.ts` runs the same race against a real local D1 (workerd through
wrangler's `getPlatformProxy`), mainly to prove that `changes()` inside a D1 batch behaves as in
`node:sqlite`. It does. That file takes about 6 seconds because it starts workerd.
`e2e/purchase.spec.ts` repeats the race with two browsers.

Expiry is lazy. Every route that reads or changes stock first releases expired holds (through
`getDbWithExpiredHoldsReleased` in `lib/db.ts`), so an abandoned checkout stops counting against
stock as soon as anyone looks, with no scheduler. The cost is one extra UPDATE per request. A Cron
Trigger calling the same function would take it off the request path; that needs a custom worker
entry around OpenNext's, which is not set up. A hold past its expiry time is never reported as
active, even before the sweep runs.

When the cart changes after a hold was taken, the old hold is released first, then the new one is
taken. Another shopper could take a unit in that moment. One batch would close the gap; I judged
it not worth the extra SQL for this shop. The minutes left on `/checkout` are computed at render
and do not tick; the stock re-check before payment is what protects the shopper.

## Checkout and payment handoff

`POST /api/checkout`, in order:

1. Refuse a foreign `Origin` (403) or a non-JSON body (415).
2. Validate with `checkoutDetailsSchema` (`lib/api/contract.ts`). Anything wrong is a 422 with one
   message per field, before the database or Stripe is touched. `acceptTerms` must be the boolean
   `true`; a missing field, `"true"`, `"on"`, `1` and `false` are all refused (tested, including
   that Stripe is never called and no order row exists).
3. Answer 503 if Stripe is not configured with test-mode values.
4. Re-check the stock: keep the hold if it still covers the cart, otherwise hold the cart afresh.
   A shortfall is a 409 with no order and no Stripe call (tested).
5. Extend the hold to outlive the Stripe session (see below).
6. Store the order with prices from D1 and `terms_accepted_at` set to the request time.
7. Create the Stripe Checkout Session (idempotency key per order) and answer 201 with its URL.

The form validates with the same zod schema before sending, so the messages match the server's.
On a failed submit, focus moves to the first invalid field in visual order; the messages are
rendered with `flushSync` first, so a screen reader announces the field together with the error
that `aria-describedby` points to. The submit button is never disabled in place of validation.
`e2e/checkout-form.spec.ts` covers focus, accessible descriptions and keyboard use.

Stripe settings come from the Worker environment (`.dev.vars` locally, `wrangler secret put` in
production; `.dev.vars.example` lists them). `lib/payments/stripe.ts` refuses anything but an
`sk_test_` key, so a live key set by mistake turns checkout off instead of taking money. The SDK
uses its fetch HTTP client, and its `workerd` export condition gives the Worker the fetch-based
build.

The hold grows past ten minutes at payment. Stripe refuses a Checkout Session that expires sooner
than 30 minutes after creation, and the hold has to outlive the session, or someone could pay for
a piece already released. At handoff the hold is extended to the session's expiry plus 5 minutes.
The brief says "around 10 minutes"; this is the one place it is exceeded.

When a shopper comes back from Stripe and submits again, the earlier pending order is marked
`superseded`, but its Stripe session is not expired through the API. With two tabs, a shopper
could pay both. The webhook marks a payment for a superseded order `needs_review` and leaves stock
alone. Expiring the old session at resubmission would close this properly.

## Payment confirmation

An order is confirmed only by `POST /api/stripe/webhook`, never by the browser coming back from
Stripe. The route reads the raw body, verifies `Stripe-Signature` with `constructEventAsync` and
the SDK's SubtleCrypto provider (the same code in Node and workerd), and refuses anything else
with 400. Refusals are logged without the secret.

Idempotency (`lib/store/payments.ts`): every event's changes run in one D1 batch whose first
statement is a plain `INSERT INTO stripe_events (id, ...)`. A second delivery fails on the primary
key, and because the batch is a transaction, none of it applies. A "seen this id?" check runs
before the batch, and again after a failed one to tell a concurrent duplicate from a real error, so
no error text is parsed. Tested with the same event twice and with five copies at once (exactly
one `paid`). With `INSERT OR IGNORE` instead, the five-copies test fails (checked by hand).

For a paid session the hold's units come off the shelf, the hold becomes `converted` and the order
`paid`, but only if the order is still the pending one for its hold, the hold is still active, and
the session id, amount and currency match. Otherwise the order becomes `needs_review` and stock is
left alone: money was taken, so a person checks stock and confirms or refunds. Tests cover a
superseded order paid from a second tab, a hold that lapsed first, and a different amount.

`checkout.session.expired` releases the hold and marks the order `expired`, only for the order that
is still pending, so a superseded order's expiry cannot free stock the newer order relies on.
`async_payment_succeeded` and `async_payment_failed` are handled like completed and expired;
`completed` with `payment_status: "unpaid"` waits.

Stripe's `success_url` is `/checkout/complete?order=<id>`. That route clears the shopper's cart and
hold cookies and redirects to `/orders/<id>`, which polls `GET /api/orders/<id>` every two seconds
for a minute and re-renders once the webhook has landed. Guest checkout has no accounts, so an
order belongs to the browser that placed it: its id (a random UUID) sits in an `HttpOnly` cookie
named `order`. Any other browser gets the same 404 as for a missing order. Only the latest order
per browser can be viewed.

## Security headers

`next.config.ts` sends `Content-Security-Policy`, `X-Content-Type-Options: nosniff` and
`Referrer-Policy: strict-origin-when-cross-origin` on every Next.js response. The policy is the
"without nonces" one from the Next.js CSP guide: `'self'` everywhere, `frame-ancestors 'none'`,
`form-action 'self'`, `object-src 'none'`, but `script-src` and `style-src` allow
`'unsafe-inline'` because the App Router bootstraps through inline scripts. A nonce-based policy
needs a `proxy.ts` on every request; I did not try that on OpenNext. `upgrade-insecure-requests` is
left out because it breaks plain-HTTP local runs; HTTPS and HSTS belong in the Cloudflare zone
settings. Static files bypass Next.js on Workers, so `public/_headers` adds `nosniff` to them.
Checked in the workerd preview: the headers arrive, and Chromium logged no CSP violations on the
catalog, product, cart and terms pages.

## Tests

`npm test` runs Vitest (86 tests). Store and route tests run the real migrations against an
in-memory database from Node's built-in `node:sqlite` (`test/sqlite-database.ts`, the same
interface as D1). The adapter yields before every call, so concurrent callers interleave between
statements roughly the way D1 round trips would. Node 22 prints an `ExperimentalWarning` for
`node:sqlite`; it is harmless. Payment tests need stripe-mock (`stripe/stripe-mock`, pinned by
digest in `test/stripe-mock.ts` and the `stripe-mock` script). `test/global-setup.ts` uses one
running on port 12111 or starts it with Docker for the run. stripe-mock checks each request
against Stripe's OpenAPI spec and answers with fixture objects, so it proves requests are well
formed, not that amounts or behaviour are right.

`npm run test:e2e` runs Playwright (6 tests) against the OpenNext build in workerd, with its own
fresh database in `.next/cache/e2e-state` and test-mode Stripe values passed with `--var`
(`e2e/serve.mjs`). It covers the whole purchase with a signed webhook, two shoppers racing for one
piece, the form's focus and error wiring, the contract error in the cart, and an axe scan for WCAG
2.1 A and AA rules on the catalog, product, cart and checkout pages (no violations found; axe was
confirmed to report a deliberately unlabeled input). The webhook in the e2e test is built and
signed by the test, playing Stripe; it reads the session id from the local D1 file.

About the browser: the brief says to run Playwright "if the browser download works here". This
container ships Chromium 141 in `/opt/pw-browsers`, and its instructions say not to run
`playwright install`, so I did not try the download. `playwright.config.ts` takes an optional
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`; here the suite ran with that pointing at the pre-installed
Chromium, and with the proxy variables unset (see Environment notes). On a normal machine,
`npx playwright install chromium` once is enough.

## npm audit

`npm audit` reports 5 high-severity findings, all one chain: `eslint-config-next` 16.4.2 →
`@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` (GHSA-vfj7-8cjw-p6xm, stack
exhaustion on deeply nested brace patterns). The advisory covers every version of `braces`, and
3.0.3 is the newest release, so there is nothing to upgrade to. `npm audit fix --force` would
downgrade `eslint-config-next` to 14.2.35, which does not support Next 16. It is a dev dependency
that only expands glob patterns written in this repo's ESLint config, and it does not reach the
deployed worker. `npm audit --omit=dev` reports 0.

A second chain is fixed with an `overrides` entry: `@opennextjs/aws` pulls `@node-minify/core`
9.0.2, which pins `glob` 10.3.3 (GHSA-5j98-mcp5-4vw2, command injection in the glob CLI's `--cmd`
flag). The override moves it to `glob` 10.5.0, the patched release in the same major. The OpenNext
build passes with it. Remove the override once `@opennextjs/aws` ships a fixed dependency.

## Not verified

- A deploy to Cloudflare, and anything on the real edge. All runtime checks used local workerd
  through wrangler. The D1 `database_id` in `wrangler.jsonc` is a zero placeholder.
- A real Stripe test account: session creation against api.stripe.com, the hosted payment page,
  and webhooks delivered by Stripe (for example through `stripe listen`). No key exists here.
- Browsers other than Chromium 141, and screen readers. The accessibility checks are axe, the
  keyboard tests and reading the markup, not a screen reader session.
- `next dev` on a machine without an HTTPS proxy (see Environment notes).

## Open questions

- Server components read through the API in-process (see "Server components and the API"). Is
  that what the brief meant, or should they read `lib/store` directly as the Next.js docs suggest?
- Sales tax and a free-shipping threshold. Stripe Tax would be the obvious route for tax.
- `needs_review` orders have no screen, since the brief rules out an admin panel. They can be listed
  with `wrangler d1 execute DB --command "SELECT * FROM orders WHERE status = 'needs_review'"`, and
  the webhook logs a warning for each. Who handles them, and how?
- No emails, receipts or refunds are sent. A webhook that arrives more than five minutes after the
  session expired finds the hold released and sends the order to `needs_review`, even if the stock
  is still there.
- Should old Stripe sessions be expired when a shopper resubmits checkout?

## Environment notes

- `opennext.js.org` is blocked by this container's network policy, so the adapter was set up from
  the templates and the `migrate` command source inside `node_modules/@opennextjs/cloudflare`.
- No Docker daemon was running at the start of the session; running `dockerd` started one, and
  `stripe/stripe-mock` pulled and ran normally.
- The container sets `HTTPS_PROXY`, and wrangler announces "We'll use your proxy for fetch
  requests". Under `next dev` that broke the server's calls to stripe-mock on localhost
  (`StripeConnectionError`); with the proxy variables unset, they worked. The same applied to the
  preview and the e2e run. I did not dig into which component ignores `NO_PROXY`.
- Wrangler and Next.js try to send telemetry; those requests are refused here and are harmless.
