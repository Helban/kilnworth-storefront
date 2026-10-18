# Kilnworth Studio storefront

A small online shop for Kilnworth Studio, a fictional ceramics workshop. It is built with Next.js
16 and runs on Cloudflare Workers through the OpenNext adapter, with Cloudflare D1 (SQLite) as its
database.

Kilnworth sells pots in small batches, and three of its thirteen pieces are one-offs with a stock
of 1. Two people can easily reach for the last moon jar at the same moment, so much of the code is
about making sure only one of them gets it.

Live: https://shop.helban.dev. Payments run in Stripe test mode only, so no real money can move;
see "Test mode" below. To try a purchase, use card 4242 4242 4242 4242 with any future date and
any CVC.

Screenshots of the main pages at 1440 and 390 px wide are in `docs/screenshots/`.

PageSpeed Insights, measured cold on the live site on 18 October 2026 (Performance /
Accessibility / Best Practices / SEO):

| Page | Mobile | Desktop |
| --- | --- | --- |
| Home | 90 to 95 / 100 / 100 / 100 (two runs) | 99 to 100 / 100 / 100 / 100 |
| Product page | 96 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Terms | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |

## What a shopper can do

- Browse the catalog, grouped into mugs, bowls, vases and one-off pieces, and see how many of
  each are left.
- Add pieces to a cart. The cart survives a reload and is always priced by the server.
- Check out as a guest. Starting checkout holds the pieces for ten minutes so nobody else can buy
  them. The form asks for an email, a US shipping address and acceptance of the terms of sale.
- Pay on Stripe's hosted Checkout page, come back to a confirmation page, and see the order
  confirmed as soon as Stripe tells the shop the payment went through.

## Running it locally

You need Node 22 (tested with 22.22) and Docker, which runs `stripe-mock`, a local stand-in for the
Stripe API.

```sh
npm ci
cp .dev.vars.example .dev.vars   # test-mode Stripe settings pointed at stripe-mock
npm run db:migrate               # creates and seeds the local D1 database in .next/cache
npm run stripe-mock              # in a second terminal; leave it running
npm run dev                      # http://localhost:3000
```

With stripe-mock, "Continue to payment" sends you to a fixture URL on checkout.stripe.com that
does not load, because stripe-mock only imitates the API. Everything up to that point is real. To
go through an actual payment page, use your own Stripe account in test mode: put its `sk_test_`
key in `.dev.vars`, remove `STRIPE_API_BASE`, and run
`stripe listen --forward-to localhost:3000/api/stripe/webhook`, copying the `whsec_` secret it
prints into `.dev.vars`. The deployed site uses that path with a real Stripe test account: a
purchase there goes through Stripe's hosted page, and the webhook marks the order paid and takes
the piece off the shelf.

`npm run dev` is the ordinary Next.js dev server. The adapter gives it the same local D1 database
that wrangler uses. To run the production build inside workerd, the runtime Cloudflare uses:

```sh
npm run preview                  # http://localhost:8787
```

Run one or the other, not both at once. `NOTES.md` explains why.

### Checks

```sh
npm run lint
npm run typecheck                # next typegen, then tsc --noEmit
npm test                         # Vitest; starts stripe-mock with Docker if none is running
npm run test:e2e                 # Playwright, against the production build in workerd
```

The first Playwright run needs a browser: `npx playwright install chromium`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a Chromium that is already installed.

## How it is put together

```
app/            pages and route handlers (app/api/...)
lib/store/      SQL for products, holds, orders and Stripe events; no Next.js imports
lib/api/        the JSON contract (zod), the typed client, the server-side transport
lib/cart/       cart cookie, pricing, checkout hold and order cookies
lib/payments/   Stripe client setup, Checkout Session creation, webhook handling
migrations/     D1 schema and seed data
test/, e2e/     Vitest helpers and Playwright specs
```

The catalog, product, cart, checkout and order pages are server components. They render on the
server from live stock on every request, with nothing cached, because stock changes with every
sale. Client components appear only where the shopper does something: the add-to-cart form, the
photo switcher on the product page, the cart editor, the checkout button and form, and the poller
on the confirmation page. Two small ones exist for the browser's sake: the photo that fades in
once it has loaded, and a helper that scrolls to a category heading when a link from another page
opens the home page.

Both sides read data the same way. Route handlers under `app/api/` serve products, the cart,
checkout and orders as JSON. The UI talks to them only through `lib/api/client.ts`, which checks
every response against the zod contract in `lib/api/contract.ts`. When a response does not match,
the page says so in plain words instead of rendering something wrong. In the browser the client
uses `fetch`. On the server it calls the route handler functions directly, because a Worker cannot
fetch its own public URL; the response still goes through JSON and the same contract.

## How two buyers are kept from the last piece

Stock is two numbers per product: `available` (on the shelf) and `reserved` (held by open
checkouts). Starting checkout runs one D1 batch, which D1 executes as a single transaction. For
each cart line it runs:

```sql
UPDATE products SET reserved = reserved + :qty
WHERE slug = :slug AND available - reserved >= :qty;

INSERT INTO reservation_lines (reservation_id, product_id, quantity)
SELECT :hold, id, :qty FROM products WHERE slug = :slug AND changes() = 1;
```

The stock check sits inside the write, so there is no moment between reading the stock and taking
it. When two shoppers race for the last unit, the second UPDATE finds nothing left, changes no
row, and that shopper is told which piece ran out. The line row is written only when its UPDATE
took the stock, so giving a hold back can never return stock that was not taken. If any line in
the cart is short, the whole hold is released at once.

A hold lasts ten minutes. Holds that run out are released before any request reads stock, so an
abandoned checkout never makes a piece look sold out for longer than that. Right before handing
the shopper to Stripe, the server checks the hold again and takes a new one if it lapsed. It then
extends the hold to outlive the Stripe session, which Stripe keeps open for at least 30 minutes.
When Stripe's webhook confirms the payment, the held units move off the shelf in the same
transaction that marks the order paid.

A test fires ten concurrent holds at a product with stock 1 and checks that exactly one succeeds,
both against SQLite and against a real local D1.

## Test mode

- The app refuses to start a payment unless its Stripe secret key starts with `sk_test_`. A live
  key configured by mistake turns checkout off; it cannot take money.
- In Stripe's test mode no money moves. On Stripe's test payment page, card 4242 4242 4242 4242
  with any future expiry date and any CVC succeeds. The checkout page says this on screen.
- Locally and in the tests, Stripe API calls go to stripe-mock, which answers with made-up objects.
- An order is confirmed only by Stripe's `checkout.session.completed` webhook with a valid
  signature, never by the shopper's browser coming back from Stripe. The same event delivered twice
  changes nothing the second time.
- Nothing is shipped, and no email is sent. Kilnworth Studio does not exist.

## Deploying

The live site was set up like this. Create the database with `wrangler d1 create kilnworth` and
put its ID in `wrangler.jsonc`. Apply the migrations with
`wrangler d1 migrations apply DB --remote`. Create a Stripe webhook endpoint for
`https://<your domain>/api/stripe/webhook` with the four `checkout.session.*` events the handler
reads. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with `wrangler secret put`, test-mode
values only. Then `npm run deploy` builds with OpenNext and deploys the Worker; the custom domain
in `wrangler.jsonc` is attached on the same run.

`NOTES.md` is the handover: what was checked and how, what was not, and the open questions.
