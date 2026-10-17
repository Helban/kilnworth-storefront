# Kilnworth Studio storefront

A small Next.js shop for a fictional ceramics workshop, built to run on Cloudflare Workers with
D1. The purchase path works end to end: catalog, cart, a ten-minute stock hold at checkout, Stripe
Checkout, and order confirmation through Stripe's webhook. The full README comes with the last
change; `NOTES.md` has the details so far.

Payments run in Stripe test mode only. The app refuses to start a payment with anything but a
Stripe test key, so no real money can move.
See `NOTES.md` for what has been checked so far.

## Running it locally

Requires Node 22 and npm.

```sh
npm ci
cp .dev.vars.example .dev.vars   # Stripe test-mode settings, pointed at stripe-mock
npm run db:migrate   # creates and seeds the local D1 database in .next/cache
npm run stripe-mock  # in a second terminal; needs Docker
npm run dev          # http://localhost:3000
```

`npm run dev` uses the regular Next.js dev server. The OpenNext adapter hooks into it so
`getCloudflareContext()` returns the same local D1 database that wrangler uses.

To run the production build inside workerd, the runtime Cloudflare uses:

```sh
npm run preview      # opennextjs-cloudflare build, then wrangler dev on the result
```

## Checks

```sh
npm run lint
npm run typecheck    # next typegen, then tsc --noEmit
npm test             # Vitest; starts stripe-mock with Docker if it is not already running
```
