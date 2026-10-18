// Every product photo exists twice in public/products/: <slug>.webp at 800x800 (the one the API
// names) and <slug>-400.webp at 400x400 for tiles and thumbnails. See
// scripts/import_product_photos.py.
export const TILE_PHOTO_SIZE = 400;

export function tilePhotoSrc(fullSrc: string): string {
  return fullSrc.replace(/\.webp$/, `-${TILE_PHOTO_SIZE}.webp`);
}
