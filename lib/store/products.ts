import type { SqlDatabase } from "./database";

export const PRODUCT_CATEGORIES = ["mug", "bowl", "vase", "one-off"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductRecord {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: ProductCategory;
  readonly priceCents: number;
  // Units a new checkout could still reserve: on the shelf minus held by open checkouts.
  readonly stockLeft: number;
}

const PRODUCT_COLUMNS = `
  slug, name, description, category,
  price_cents AS priceCents,
  available - reserved AS stockLeft`;

export async function listProducts(db: SqlDatabase): Promise<ProductRecord[]> {
  const { results } = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY sort_order`)
    .all<ProductRecord>();
  return results;
}

export async function findProductBySlug(
  db: SqlDatabase,
  slug: string,
): Promise<ProductRecord | null> {
  return db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE slug = ?`)
    .bind(slug)
    .first<ProductRecord>();
}

export async function findProductsBySlugs(
  db: SqlDatabase,
  slugs: readonly string[],
): Promise<ProductRecord[]> {
  if (slugs.length === 0) return [];
  const placeholders = slugs.map(() => "?").join(", ");
  const { results } = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE slug IN (${placeholders})`)
    .bind(...slugs)
    .all<ProductRecord>();
  return results;
}
