"""Convert generated product photos into the shop's WebP files (800 and 400 px) and a contact sheet.

Usage: python import_product_photos.py <source_dir> <contact_sheet.png>
Reads <source_dir>/kilnworth-<slug>.jpg for every slug in the seed migration.
"""
import re
import sys
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_MIGRATION = REPO_ROOT / "migrations" / "0002_seed_products.sql"
PRODUCTS_DIR = REPO_ROOT / "public" / "products"
PHOTO_SIZE = 800
# Catalog tiles render at about 250 CSS px, so 400 px covers 1.6x density without the 800 px download.
TILE_SIZE = 400
WEBP_QUALITY = 82
SHEET_COLUMNS = 4
SHEET_TILE = 320


def main() -> None:
    source_dir = Path(sys.argv[1])
    sheet_path = Path(sys.argv[2])
    slugs = read_slugs()
    photos = [load_square_photo(source_dir / f"kilnworth-{slug}.jpg") for slug in slugs]
    for slug, photo in zip(slugs, photos):
        photo.save(PRODUCTS_DIR / f"{slug}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
        tile = photo.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS)
        tile.save(PRODUCTS_DIR / f"{slug}-{TILE_SIZE}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
    build_contact_sheet(photos).save(sheet_path)
    print(f"Wrote {len(slugs)} photos to {PRODUCTS_DIR}")


def read_slugs() -> list[str]:
    seed_sql = SEED_MIGRATION.read_text(encoding="utf-8")
    return re.findall(r"^\s*\('([a-z0-9-]+)',", seed_sql, flags=re.MULTILINE)


def load_square_photo(path: Path) -> Image.Image:
    with Image.open(path) as source:
        photo = source.convert("RGB")
    side = min(photo.size)
    left = (photo.width - side) // 2
    top = (photo.height - side) // 2
    square = photo.crop((left, top, left + side, top + side))
    return square.resize((PHOTO_SIZE, PHOTO_SIZE), Image.Resampling.LANCZOS)


def build_contact_sheet(photos: list[Image.Image]) -> Image.Image:
    rows = -(-len(photos) // SHEET_COLUMNS)
    sheet = Image.new("RGB", (SHEET_COLUMNS * SHEET_TILE, rows * SHEET_TILE), "white")
    for index, photo in enumerate(photos):
        tile = photo.resize((SHEET_TILE, SHEET_TILE), Image.Resampling.LANCZOS)
        sheet.paste(tile, ((index % SHEET_COLUMNS) * SHEET_TILE, (index // SHEET_COLUMNS) * SHEET_TILE))
    return sheet


if __name__ == "__main__":
    main()
