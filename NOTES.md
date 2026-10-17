# Handover notes

Written for whoever picks this up next. It records what was checked, how, and what was not.
Update it in the same pull request as the change it describes.

## Status

| Slice | State |
| --- | --- |
| Platform check (Next.js + OpenNext + D1) | Done, see below |
| Catalog, API, typed client | Done, see "Catalog" below |
| Cart | Done, see "Cart" below |
| Stock reservations at checkout | Done, see "Reservations" below |
| Checkout form, terms consent, orders, Stripe handoff | Done, see "Checkout and payment handoff" below |
| Stripe webhook, order confirmation | Not started |
| README, e2e tests | Not started |

## Platform check

Run on 2026-10-17 in a Linux container, Node 22.22.0, npm 10.9.4.

Versions, taken from npm on that day and pinned exactly in `package.json`:

- `next` 16.4.2 (npm `latest`)
- `@opennextjs/cloudflare` 1.20.12 (npm `latest`; its peer range is `>=16.4.1` for Next 16)
- `wrangler` 4.151.1, which ships `workerd` 1.20261012.1
- `react` / `react-dom` 19.3.1
- `typescript` 5.9.3. npm `latest` is 7.0.2, the Go rewrite. `create-next-app@16.4.2` still
  writes `^5`, so I stayed on the newest 5.x rather than test Next's type-check step against 7.
- `eslint` 10.13.0. `create-next-app` writes `^9`, but npm marks 9.x as unsupported, and
  `eslint-config-next` 16.4.2 lints cleanly on 10.

What was run, with a D1 binding named `DB` (local mode; the state directory moved later, see
"Local D1 state" below):

1. `next dev`: `GET /api/health` runs `SELECT 1` against D1 through `getCloudflareContext()` and
   returns 200.
2. `next dev` and `wrangler d1 execute DB --local` share one database. A table created with
   wrangler showed up in a query from the dev server, and disappeared again after a `DROP`.
3. `next build`: passes.
4. `opennextjs-cloudflare build`: passes.
5. `opennextjs-cloudflare preview` (the built worker running in workerd): `/` and
   `/api/health` return 200, and the health route reads D1.

Result: the combination works. No platform or database change was needed.

### Two things that surprised me

`create-next-app@16.4.2` turns on `cacheComponents` and `partialPrefetching` by default. I tried
that setup on workerd with a temporary page that streams a D1 query inside `<Suspense>`:

- With the adapter's default `dummy` incremental cache, every page, including the static `/`,
  hung until workerd cancelled the request ("Worker's code had hung"). The route handler still
  worked.
- With the `static-assets` incremental cache, the pages rendered and streamed correctly. But
  workerd logged a warning from Next.js itself: "Next.js cannot guarantee that Cache Components
  will run as expected due to the current runtime's implementation of `setTimeout()`."
- With `cacheComponents` off, both caches worked and the warning was gone.

Every page in this shop reads live stock, so the static shell Cache Components would produce is
small. I turned it off rather than ship on a mode the framework warns about on this runtime.
`partialPrefetching` requires it, so that is off too. The static-assets incremental cache stays,
because there is no ISR here and it needs no KV or R2 bucket.

Under Cache Components, `getCloudflareContext()` also failed the build prerender with "encountered
the unstable value `new Date()`". `await io()` before it fixed that. This matters only if someone
turns Cache Components back on.

## Catalog

Products live in D1 (`migrations/0001_create_products.sql`). The 13 seed products are a
migration too (`0002_seed_products.sql`), so `wrangler d1 migrations apply --remote` seeds a real
database the same way it seeds the local one. Change the catalog with a new migration, not by
editing 0002.

Data path: `lib/store` holds the SQL and knows nothing about Next.js. The route handlers in
`app/api/products/` turn store records into the JSON contract in `lib/api/contract.ts`. The UI reads
only through `lib/api/client.ts`, which checks every response against that contract with zod and
returns failures as values (`network`, `http` or `contract`) that the page has to render.

### Server components and the API

The brief asks for the UI to fetch through one typed client against our own route handlers, while
the catalog and product pages are server components. The Next.js docs say the opposite for server
components: "Fetch data in Server Components directly from its source, not via Route Handlers"
(`node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`). Over HTTP it would also
not work cleanly here. A Worker cannot fetch its own public URL, and the `WORKER_SELF_REFERENCE`
binding that OpenNext provides throws under `next dev` (checked).

What I did: `lib/api/server.ts` builds the same client, but its transport calls the route handler
functions directly instead of going over the network. The response still goes through
`Response.json()`, `.json()` and the zod contract, so a server component sees exactly what the
browser would. The cost is a small hand-written route table. If it grows past a handful of routes,
server components should call `lib/store` directly instead. That is an open question for whoever
owns the brief.

### Unknown product URLs answer 200, not 404

`/products/<unknown>` renders the not-found page with `<meta name="robots" content="noindex">`,
but the status is 200. The product page has a loading state (`loading.tsx`), so Next.js has
already started streaming when the page calls `notFound()`, and the status line is gone. Checked
under `next dev` and in the workerd preview, with a browser and a Googlebot user agent: both get
200. The API itself answers a real 404 (`/api/products/<unknown>`). Getting a 404 page status back
would mean dropping the loading state for that route, which the brief asks for.

### Images

One 800x800 WebP per product in `public/products/<slug>.webp`, generated with ImageMagick as flat
placeholders. Swap in real photos at the same size and file name, and nothing else changes.
`next.config.ts` sets `images.unoptimized` because no resizing service is bound (that would be the
Cloudflare Images binding). The product page shows the image at up to 480 CSS pixels, so 800 is
close to 2x. Catalog tiles are smaller, about 250 CSS pixels, so they download more pixels than
they show. With flat placeholders that is about 3 KB each. With real photos it should be fixed by
binding Cloudflare Images or exporting a second, smaller size.

## Cart

The cart is a cookie named `cart` holding slugs and quantities, nothing else: `HttpOnly`,
`Secure`, `SameSite=Lax`, 30 days. It is parsed with zod on every read, and anything malformed
counts as an empty cart. Prices never come from the client. `GET /api/cart` prices each line from
D1 through `priceCart` (`lib/cart/pricing.ts`), so a price change shows up on the next read, and a
price written into the cookie by hand is dropped (both tested).

Adding to the cart checks the quantity against the stock left (shelf minus open reservations) and
answers 409 with a shopper-readable message. That is only a courtesy. Nothing is held until
checkout, so the cart can still say "3 left" when someone else is about to buy them.

Cart writes are `POST /api/cart/lines` and `PUT /api/cart/lines/<slug>`. Both refuse a non-JSON
body (415) and an `Origin` header that does not match the host (403). Together with `SameSite=Lax`
that covers CSRF without a token. A request without `Origin` is allowed, because browsers always
send it on cross-origin POST and PUT.

Shipping is a flat $9.00 for any US address. There is no sales tax and no free-shipping threshold.
Both are open questions for the shop owner; Stripe Tax would be the obvious route for tax.

### Local D1 state

The local D1 database lives in `.next/cache/wrangler-state`, not wrangler's default
`.wrangler/state`. `next.config.ts`, `npm run db:migrate` and `npm run preview` all point there, so
they share one database. `next build` leaves `.next/cache` alone (checked), but deleting `.next`
deletes the local database; run `npm run db:migrate` again afterwards.

Why it moved. With the default location, an open browser tab on `next dev` reloaded several
times a second (52 navigations in 6 seconds, measured with an idle Chromium tab). Every D1 query
creates or touches SQLite `-wal` and `-shm` files, Turbopack watches the project tree, and each
change set off a Fast Refresh rebuild and a reload, which queried D1 again. Turbopack has no
setting to ignore a directory, but it does ignore its own `.next`. With the state there, 30 API
requests with a tab open caused 0 recompiles.

My first attempt, `node_modules/.cache`, looked fine in a short test and was wrong. On a longer
run Turbopack reacted to the `-wal` and `-shm` files appearing there as well. That short test was
also skewed by the second problem below.

The second runtime. `initOpenNextCloudflareForDev()` starts wrangler's local runtime
asynchronously. If a request reaches `getCloudflareContext({ async: true })` before it has
finished, the adapter starts a second runtime of its own, without the options passed to the
first one, so with wrangler's default state directory and an empty database. Whichever finished
last served every request afterwards. In practice that meant either "no such table: products" or
the reload loop, depending on timing. `next.config.ts` now exports an async config that awaits the
initialisation in the dev-server phase only. After the change, both workerd processes that
`next dev` starts open `.next/cache/wrangler-state` (checked in `/proc/<pid>/fd`), and no
`.wrangler/` directory appears.

## Reservations

Pressing "Check out" in the cart sends `POST /api/checkout/reservation`, which holds every line of
the cart for ten minutes, or none of them. The reservation id goes into an `HttpOnly` cookie
named `checkout`. Holding is a POST from a click, never a side effect of rendering `/checkout`, so
a prefetch cannot take stock.

How the race is prevented (`lib/store/reservations.ts`): one D1 batch, which D1 runs as a single
transaction. It inserts the reservation row, then for each line:

1. `UPDATE products SET reserved = reserved + :qty WHERE slug = :slug AND available - reserved >= :qty`
2. `INSERT INTO reservation_lines ... SELECT ... WHERE changes() = 1`

The check and the write are one statement, so there is no gap between reading stock and taking
it. The line row that records the hold exists only if its UPDATE changed a row, so releasing a
hold can never return stock that was not taken. If any line comes up short, the lines that
succeeded are released straight away, and the shopper gets a 409 naming the short pieces. A
`CHECK (reserved <= available)` on `products` is a second backstop.

Tested in `lib/store/reservations.test.ts`: ten concurrent `reserveStock` calls for the moon jar
(stock 1) give exactly one success, `reserved` ends at 1, and there is one line row. The test
database yields to the event loop before every statement, so a read-then-write version would
interleave and fail. I checked the other direction by hand: with the `available - reserved >= qty`
condition removed, the race test fails. `lib/store/reservations.d1.test.ts` runs the same race
against a real local D1 (workerd through wrangler's `getPlatformProxy`), mainly to prove that
`changes()` inside a D1 batch behaves as it does in `node:sqlite`. It does. That file takes about
6 seconds because it starts workerd.

Expiry is lazy. Every route that reads or changes stock first runs `releaseExpiredReservations`
(through `getDbWithExpiredHoldsReleased` in `lib/db.ts`). An abandoned checkout therefore stops
counting against stock as soon as anyone looks, without a scheduler. The cost is one extra UPDATE
per request. A Cron Trigger calling the same function would move it off the request path; that
needs a custom worker entry around OpenNext's, which I did not set up. A hold past its expiry
time is never reported as active, even before the sweep has run.

Two smaller decisions:

- A shopper's own hold counts as available to them. Without that, the piece they are holding
  reads as sold out in their own cart.
- Taking a new hold after the cart changed releases the old one first, then reserves. Another
  shopper could take a unit in the moment between. Doing both in one batch would close that gap,
  but I judged it not worth the extra SQL for this shop.

The time left on `/checkout` is computed when the page renders and does not tick. A page left
open goes stale; the stock re-check before payment (next slice) is what actually protects the
shopper.

## Checkout and payment handoff

`POST /api/checkout` works in this order:

1. Refuse a foreign `Origin` (403) or a non-JSON body (415).
2. Validate the details with `checkoutDetailsSchema` (`lib/api/contract.ts`). Anything wrong is a
   422 with one message per field, before the database or Stripe is touched. `acceptTerms` must
   be the boolean `true`; a missing field, `"true"`, `"on"`, `1` and `false` are all refused
   (tested).
3. Refuse with 503 if Stripe is not configured with test-mode values.
4. Re-check the stock: keep the shopper's hold if it still covers the cart, otherwise hold the cart
   afresh. A shortfall is a 409 naming the pieces, with no order and no Stripe call (tested).
5. Extend the hold to outlive the Stripe session (see below).
6. Store the order with the prices from D1 and `terms_accepted_at` set to the request time.
7. Create the Stripe Checkout Session and answer 201 with its URL. The browser goes there.

The checkout form validates with the same zod schema before sending, so the messages match the
server's. On a failed submit, focus moves to the first invalid field in visual order. The
messages are rendered (with `flushSync`) before focus moves, so a screen reader announces the
field together with the error that `aria-describedby` now points to. The submit button is never
disabled to stand in for validation. I went through it in Chromium with the keyboard only: empty
submit, focus on Email with hint and error read out, the terms checkbox ticked with Space, Tab to
the button, Enter, redirect to the Stripe URL.

Stripe settings come from the Worker environment (`.dev.vars` locally, `wrangler secret put` in
production; `.dev.vars.example` lists them). `lib/payments/stripe.ts` refuses anything but an
`sk_test_` key, so a live key configured by mistake disables checkout instead of taking money.
The SDK uses its fetch HTTP client, and its `workerd` export condition gives the Worker the
fetch-based build; the OpenNext preview created sessions against stripe-mock without trouble.
Each session request carries an idempotency key per order.

The hold is longer than ten minutes once the shopper reaches payment. Stripe refuses a Checkout
Session that expires sooner than 30 minutes after creation, and the hold has to outlive the
session, or someone could pay for a piece that was already released. So at handoff the hold is
extended to the session's expiry plus 5 minutes. The ten-minute hold still applies to everything
before that point. The brief says "around 10 minutes"; this is the one place it is exceeded.

Known gap: when a shopper comes back from Stripe and submits again, the earlier pending order is
marked `superseded`, but its Stripe session is not expired through the API. With two tabs open, a
shopper could pay both sessions. The webhook (next slice) has to treat a payment for a superseded
order as needing review.

Tests use stripe-mock (`stripe/stripe-mock`, pinned by digest in `test/stripe-mock.ts` and in the
`stripe-mock` npm script). `test/global-setup.ts` uses a running instance on port 12111 or starts
one with Docker for the run and stops it after. stripe-mock checks each request against Stripe's
OpenAPI spec and answers with fixture objects, so it proves the request is well formed. It does
not prove amounts or behaviour: the session it returns does not echo our line items. Not verified
against a real Stripe test account, because no key exists in this environment.

## npm audit

`npm audit` reports 5 high-severity findings, all one chain:
`eslint-config-next` 16.4.2 → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`
(GHSA-vfj7-8cjw-p6xm, stack exhaustion on deeply nested brace patterns). The advisory range is
every version of `braces`, and 3.0.3 is the newest release, so there is nothing to upgrade to.
`npm audit fix --force` would downgrade `eslint-config-next` to 14.2.35, which does not support
Next 16. It is a dev dependency that only expands glob patterns written in this repo's ESLint
config, never user input, and it does not reach the deployed worker.

A second chain is fixed with an `overrides` entry in `package.json`: `@opennextjs/aws` pulls
`@node-minify/core` 9.0.2, which pins `glob` 10.3.3 (GHSA-5j98-mcp5-4vw2, command injection in
the glob CLI's `--cmd` flag). The override moves it to `glob` 10.5.0, the patched release in the
same major. The OpenNext build still passes with it. Remove the override once `@opennextjs/aws`
ships a fixed dependency.

## Not verified

- Deploying to Cloudflare. The D1 `database_id` in `wrangler.jsonc` is a zero placeholder. Run
  `wrangler d1 create kilnworth` and paste the real id before the first deploy.
- Anything on a real Cloudflare edge. All runtime checks used local workerd through wrangler.

## Tests

`npm test` runs Vitest. Store and route tests run the real migrations against an in-memory
database from Node's built-in `node:sqlite`, through `test/sqlite-database.ts`, which has the same
interface as D1. Node 22 prints an `ExperimentalWarning` for `node:sqlite`; it is harmless. The
adapter yields to the event loop before every call, so concurrent callers interleave between
statements roughly the way D1 round trips would.

Not covered by unit tests: the pages themselves. Vitest cannot render async server components
(the Next.js testing guide says so), so they are left for the Playwright run. Until then, the cart
flow (add, refuse past stock, change quantity, remove, empty state, header count) was clicked
through in Chromium with a throwaway script, against `next dev` and against the workerd preview.

## Environment notes

- `opennext.js.org` is blocked by this container's network policy, so the adapter was set up from
  the templates and the `migrate` command source inside `node_modules/@opennextjs/cloudflare`.
- Docker: no daemon was running at the start of the session, but running `dockerd` started one,
  and `stripe/stripe-mock` pulled and ran normally.
- The container sets `HTTPS_PROXY`, and wrangler announces "We'll use your proxy for fetch
  requests". Under `next dev` that broke the server's calls to stripe-mock on localhost
  (`StripeConnectionError`); with the proxy variables unset for the dev server, they worked. I did
  not dig into which component ignores `NO_PROXY`. On a machine without a proxy this should not
  come up, but that is not verified.
- Wrangler and Next.js try to send telemetry; those requests are refused here and are harmless.
