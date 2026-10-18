import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/store/products";

export const CATEGORY_NAMES: Record<ProductCategory, string> = {
  mug: "Mugs and cups",
  bowl: "Bowls",
  vase: "Vases",
  "one-off": "One of a kind",
};

// The home page gives each category heading this id, so the header and footer can link to it.
export function categoryHeadingId(category: ProductCategory): string {
  return `category-${category}`;
}

export const CATEGORY_LINKS = PRODUCT_CATEGORIES.map((category) => ({
  href: `/#${categoryHeadingId(category)}`,
  name: CATEGORY_NAMES[category],
}));
