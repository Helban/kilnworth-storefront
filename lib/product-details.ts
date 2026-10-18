export interface ProductDetail {
  readonly label: "Size" | "Glaze" | "Care";
  readonly value: string;
}

// Size, glaze and care, taken only from what each description in
// migrations/0002_seed_products.sql already says; nothing here is new information. It lives in the
// UI because the brief kept the API unchanged. If product copy starts changing, move these into the
// products table and the API contract so they cannot drift from the description.
const DETAILS: Record<string, ProductDetail[]> = {
  "ash-glaze-mug": [
    { label: "Size", value: "350 ml" },
    { label: "Glaze", value: "Wood ash over a speckled clay body" },
    { label: "Care", value: "Dishwasher safe" },
  ],
  "iron-speckle-mug": [
    { label: "Size", value: "300 ml" },
    { label: "Glaze", value: "White, with iron flecks from the clay" },
  ],
  "tall-celadon-mug": [
    { label: "Size", value: "450 ml" },
    { label: "Glaze", value: "Pale green celadon, unglazed foot" },
  ],
  "espresso-cups-pair": [
    { label: "Size", value: "Two cups of 90 ml, no handles" },
    { label: "Glaze", value: "Inside only, raw clay outside" },
  ],
  "oat-breakfast-bowl": [
    { label: "Size", value: "15 cm, deep" },
    { label: "Glaze", value: "Matte oat" },
  ],
  "tenmoku-ramen-bowl": [
    { label: "Size", value: "20 cm, wide" },
    { label: "Glaze", value: "Dark tenmoku, breaking to rust at the rim" },
  ],
  "nesting-bowls": [{ label: "Size", value: "10, 13 and 16 cm" }],
  "wide-serving-bowl": [
    { label: "Size", value: "32 cm, shallow" },
    { label: "Glaze", value: "White, iron-oxide rim" },
  ],
  "slate-bud-vase": [
    { label: "Size", value: "12 cm, narrow neck" },
    { label: "Glaze", value: "Dark slate" },
  ],
  "shino-bottle-vase": [
    { label: "Size", value: "24 cm" },
    { label: "Glaze", value: "Shino, with orange flashing from the kiln" },
  ],
  "moon-jar": [{ label: "Size", value: "30 cm, thrown in two halves" }],
  "ash-lidded-jar": [
    { label: "Size", value: "18 cm, with a fitted lid" },
    { label: "Glaze", value: "Wood ash, run heavily down one side" },
  ],
  "ripple-platter": [{ label: "Size", value: "38 cm" }],
};

export function detailsFor(slug: string): ProductDetail[] {
  return DETAILS[slug] ?? [];
}
