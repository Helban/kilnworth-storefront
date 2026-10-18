# Design brief: Kilnworth Studio

The shop works. This pass makes it look like a small ceramics studio's own shop instead of a
wireframe. Behaviour, routes, API and tests stay as they are; every existing test must still
pass, and the accessibility wiring on the checkout form must not regress.

## Photos are the design

Real product photos now live in `public/products/`: `<slug>.webp` at 800x800 and
`<slug>-400.webp` at 400x400, all shot on the same warm mid-gray plaster table and wall. The page
should frame them, not compete with them. No borders, shadows or cards around photos. Catalog
tiles use the 400 file (with the 800 file as the 2x source in `srcSet`), the product page uses
the 800 file. Width and height are always set; only below-the-fold images are lazy.

## Palette

Derived from the photos. Define these as CSS custom properties / Tailwind theme tokens and use
only the tokens in components.

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#F5F4F2` | Page background, a light neutral gray that sits next to the photo wall tone |
| `surface` | `#FFFFFF` | Form fields, order summary panel |
| `ink` | `#1E1C1A` | Text, primary button background |
| `ink-muted` | `#5E5954` | Secondary text, stock counts |
| `line` | `#D9D5CF` | Hairline dividers, input borders |
| `clay` | `#8C3D1F` | Iron-oxide accent: low stock ("1 left"), links on hover, the test-mode notice |
| `glaze` | `#4F6B5D` | Positive states only: "Paid", "Added to cart" |
| `error` | `#A12A1B` | Form errors, with text, never color alone |

Check every text pair against its real background at 4.5:1 and fix the token, not the
component, if one fails.

## Type

Headings: **Newsreader** (Google Fonts, through `next/font`), weights 400 and 500, optical
size on. Body and UI: **Public Sans** 400 and 600. Prices use tabular figures. Body 16 px
minimum, line length under 70 characters. Headings are plain: no italics for accent words, no
small caps labels above them, no numbers in front of section titles.

## Layout

Max content width about 1200 px, generous side gutters, 8 px spacing rhythm.

**Header.** Wordmark "Kilnworth Studio" in Newsreader on the left, "Cart" with the item count
on the right. One hairline under it. Sticky is fine if it stays thin.

**Home.** Open with a two-column intro on desktop: the "Current batch" heading and two short
sentences on the left (what the studio makes, that pieces do not come back once sold), and
the moon jar photo large on the right, linking to its page. Stack on mobile, text first.

Then the four categories, deliberately not the same grid four times:
- Mugs and cups, Bowls: a 4-column grid on desktop, 2 on mobile. Photo, then name and price on
  one line, stock under it.
- Vases: 2 larger tiles side by side.
- One of a kind: full-width rows, photo on one side and name, short description, price and
  "One piece" on the other, alternating sides on desktop.

Stock: "1 left" / "2 left" in `clay`, higher counts in `ink-muted`, "Sold out" in `ink-muted`
with the photo at reduced opacity and no add-to-cart.

**Product page.** Photo left (sticky on desktop while the details scroll), details right:
name, price, stock, quantity and "Add to cart", then the description and a short definition
list built from what the description already says (size, glaze, care). Keep the existing
back link.

**Cart.** A plain list: 80 px thumbnail, name, quantity control, line price. Totals block on
the right on desktop, under the list on mobile. One primary button, "Check out".

**Checkout.** Form left, order summary right in a white `surface` panel. Group the fields with
fieldsets (Contact, Shipping address). The terms checkbox sits directly above the pay button.
The hold timer note and the test-mode notice are calm one-line notices, not alarms.

**Order page.** Status first and big ("Paid", "Waiting for payment confirmation"), then the
lines, then the shipping address.

**Footer.** One line: the demo disclaimer that is already there, plus a link to the terms page.

## Controls

Buttons are rectangles with 2 px radius, at least 44 px tall. Primary: `ink` background, white
text. Secondary: 1 px `ink` border, transparent. Visible focus ring on everything (2 px, offset).
Inputs: white, 1 px `line` border, 2 px radius, label above.

## Motion

Only one thing moves: photos fade in once loaded (200 ms). Under `prefers-reduced-motion` it is
off. The cart count does not animate: a fading number fails a contrast check mid-fade.

## Banned

Gradient text, small uppercase labels above headings, cream or beige page background,
side-stripe accent borders, italic accent words in headlines, "01 / 02 / 03" section numbers,
monospace labels, pill-shaped buttons, drop shadows on photos, emoji.

## Done when

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` all pass.
- Screenshots of home, a product page, cart and checkout at 1440 px and 390 px wide are
  committed under `docs/screenshots/` so the change can be reviewed without running the app.
- No horizontal scroll at 390 px.
- NOTES.md gains a short "Design pass" section: what changed, and anything you deliberately
  did not follow from this brief and why.

---

# Second pass: give the shop a place and a story

The first pass framed the photos well but reads as a plain catalog on a white page. A visitor
should feel they are in a small working studio before they see a price. Everything above still
applies (palette, type, bans, controls). Behaviour, routes, API contract and existing tests stay
unchanged; add tests only for new interactive parts. Use the copy below as written.

## New photos (already in `public/`)

- `public/studio/studio-wide-2000.webp` and `-1000.webp`: the studio, 16:9.
- `public/studio/process-throwing-900.webp`, `process-glazing-900.webp`,
  `process-kiln-900.webp` and their `-450` copies: 4:5 portraits.
- `public/products/<slug>-detail.webp` (800) and `<slug>-detail-400.webp` for every product: a
  close-up of the glaze. Derive the path the way `tilePhotoSrc` does; do not change the API.
- `public/batch-*.webp` is no longer used. Delete it.

## Home

1. **Hero, full bleed.** The studio photo across the full viewport width (outside
   `page-width`), about 72vh tall on desktop and 56vh on a phone, `object-fit: cover`,
   eager with `fetchPriority="high"`, `srcSet` 1000w/2000w, `sizes="100vw"`. Over its left
   half, white text on a dark scrim (a CSS gradient from about 70% `ink` to transparent; the
   scrim is fine, gradient TEXT is still banned). Measure contrast of the text over the real
   photo and the scrim at both widths; it must be 4.5:1 or better.
   - h1: "Current batch"
   - p: "Mugs, bowls and vases from our last firing. We make a few of each, and once a piece
     sells it does not come back."
   - primary button (white background, `ink` text): "See the pieces", linking to `#pieces`.
2. **Info strip** directly under the hero, one row on desktop, wrapping on a phone, hairline
   below: "A new batch about every six weeks", "Ships within three business days",
   "30 days to return unused pieces". Plain text, no icons.
3. **The catalog** as it is now, under an anchor `id="pieces"`.
4. **"How a batch is made"**: a full-bleed band in `ink` background with `bg`-colored text,
   placed between Vases and One of a kind. Not three equal columns: the throwing photo large
   on the left (spanning both rows on desktop), glazing and kiln smaller on the right, each with
   an h3 and its text beside or under it. On a phone, stack in the order throwing, glazing,
   kiln.
   - h2: "How a batch is made"
   - Throwing: "Every piece starts on the wheel. A mug takes about ten minutes to throw and
     two days to dry before it gets a handle."
   - Glazing: "We mix our own glazes and try each one on test tiles before it goes near a pot.
     The wall of tiles is how we choose."
   - Firing: "The kiln runs for about twelve hours and takes another day to cool. Ash and iron
     move in the heat, so no two pieces come out the same."

## Header

Add links to the four categories (anchors on the home page: Mugs and cups, Bowls, Vases,
One of a kind) between the wordmark and Cart on desktop. On a phone, show them as a second
row under the wordmark that wraps; no hamburger menu.

## Product page

- **Two photos.** The main photo plus the glaze close-up. Under the main photo, two thumbnail
  buttons switch between them (`aria-pressed`, labelled "Show the whole piece" and "Show the
  glaze up close", 44 px minimum). Without JavaScript the main photo shows.
- **Shipping and returns** as a `<details>` element under the description:
  summary "Shipping and returns", body "Flat $9.00 shipping within the US. Pieces leave the
  studio within three business days. Unused pieces can be returned within 30 days." and a
  link "Full terms of sale" to `/terms`.
- **"More from this batch"**: up to four other in-stock products from the same category (fall
  back to any category if fewer than two), as tiles like the catalog, at the bottom of the page.

## Footer

Three parts on desktop, stacked on a phone, on the `bg` background with a hairline above:
- the wordmark and "Kilnworth Studio is a two-person pottery in Portland, Oregon. Everything
  here is thrown, glazed and fired in one room.";
- links: the four categories and "Terms of sale";
- the existing line "Kilnworth Studio is a fictional shop and this site is a demo. No real
  orders are taken." with "Built by helban.dev" linking to https://helban.dev (underlined).

## Done when (second pass)

Same checks as the first pass, all green, plus: the new screenshots replace the old ones in
`docs/screenshots/` (home, a product page with the thumbnails visible, cart, checkout, at 1440
and 390 px), taken from `npm run preview` after scrolling once so lazy photos have loaded. A
short "Second design pass" section in NOTES.md.
