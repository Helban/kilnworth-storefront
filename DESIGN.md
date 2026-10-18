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

Only two things move: photos fade in once loaded (200 ms), and the cart count updates with a
short crossfade. Nothing else. Under `prefers-reduced-motion` both are off.

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
