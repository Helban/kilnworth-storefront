# Handover notes

Written for whoever picks this up next. It records what was checked, how, and what was not.
Update it in the same pull request as the change it describes.

## Status

| Slice | State |
| --- | --- |
| Platform check (Next.js + OpenNext + D1) | Done, see below |
| Catalog, API, typed client | Not started |
| Cart | Not started |
| Checkout, reservations, terms consent | Not started |
| Stripe Checkout (test mode), webhook | Not started |
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

What was run, with a D1 binding named `DB` (local mode, state in `.wrangler/state`):

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

## Environment notes

- `opennext.js.org` is blocked by this container's network policy, so the adapter was set up from
  the templates and the `migrate` command source inside `node_modules/@opennextjs/cloudflare`.
- The Docker CLI is installed but no daemon is running. This matters later for `stripe/stripe-mock`.
- Wrangler and Next.js try to send telemetry; those requests are refused here and are harmless.
