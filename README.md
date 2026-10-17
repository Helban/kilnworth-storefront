# Kilnworth Studio storefront

A small Next.js shop for a fictional ceramics workshop, built to run on Cloudflare Workers with
D1. Work in progress: the catalog and product pages work, the cart and checkout do not exist yet.
See `NOTES.md` for what has been checked so far.

## Running it locally

Requires Node 22 and npm.

```sh
npm ci
npm run db:migrate   # creates and seeds the local D1 database in .wrangler/state
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
npm test             # Vitest, against an in-memory SQLite with the real migrations
```
