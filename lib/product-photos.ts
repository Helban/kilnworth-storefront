import type { Product } from "@/lib/api/contract";

// Every product has two photos in public/products/, the whole piece (<slug>.webp, the one the API
// names) and a close-up of its glaze (<slug>-detail.webp). Each is 800x800, with a 400x400 copy
// ending in -400.webp for tiles and thumbnails. See scripts/import_product_photos.py.
export const TILE_PHOTO_SIZE = 400;

export function tilePhotoSrc(fullSrc: string): string {
  return fullSrc.replace(/\.webp$/, `-${TILE_PHOTO_SIZE}.webp`);
}

export function glazePhoto(piece: Product["image"]): Product["image"] {
  return { ...piece, src: piece.src.replace(/\.webp$/, "-detail.webp") };
}
