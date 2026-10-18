"""Convert generated photos into the shop's WebP files and a contact sheet.

Usage: python import_product_photos.py <source_dir> <contact_sheet.png>

Reads from <source_dir>:
- kilnworth-<slug>.jpg and kilnworth-detail-<slug>.jpg for every slug in the seed migration,
  written to public/products/<slug>.webp and <slug>-detail.webp (800 px) plus -400 variants;
- the studio photos in STUDIO_PHOTOS, written to public/studio/ at two widths each.
"""
import re
import sys
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_MIGRATION = REPO_ROOT / "migrations" / "0002_seed_products.sql"
PRODUCTS_DIR = REPO_ROOT / "public" / "products"
STUDIO_DIR = REPO_ROOT / "public" / "studio"
PHOTO_SIZE = 800
# Catalog tiles render at about 250 CSS px, so 400 px covers 1.6x density without the 800 px download.
TILE_SIZE = 400
WEBP_QUALITY = 82
SHEET_COLUMNS = 4
SHEET_TILE = 320
# Source file stem -> (published name, full width). Each also gets a half-width copy.
STUDIO_PHOTOS = {
    "kilnworth-studio-wide-clean": ("studio-wide", 2000),
    "kilnworth-process-throwing": ("process-throwing", 900),
    "kilnworth-process-glazing": ("process-glazing", 900),
    "kilnworth-process-kiln": ("process-kiln", 900),
}


def main() -> None:
    source_dir = Path(sys.argv[1])
    sheet_path = Path(sys.argv[2])
    sheet_photos = import_product_photos(source_dir)
    sheet_photos += import_studio_photos(source_dir)
    build_contact_sheet(sheet_photos).save(sheet_path)
    print(f"Wrote {len(sheet_photos)} photos; contact sheet at {sheet_path}")


def import_product_photos(source_dir: Path) -> list[Image.Image]:
    imported = []
    for slug in read_slugs():
        for suffix in ("", "-detail"):
            photo = load_square_photo(source_dir / f"kilnworth{suffix}-{slug}.jpg")
            save_square(photo, PRODUCTS_DIR / f"{slug}{suffix}")
            imported.append(photo)
    return imported


def import_studio_photos(source_dir: Path) -> list[Image.Image]:
    STUDIO_DIR.mkdir(exist_ok=True)
    imported = []
    for stem, (name, full_width) in STUDIO_PHOTOS.items():
        with Image.open(source_dir / f"{stem}.jpg") as source:
            photo = source.convert("RGB")
        for width in (full_width, full_width // 2):
            height = round(photo.height * width / photo.width)
            resized = photo.resize((width, height), Image.Resampling.LANCZOS)
            resized.save(STUDIO_DIR / f"{name}-{width}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
        imported.append(photo)
    return imported


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


def save_square(photo: Image.Image, target_stem: Path) -> None:
    photo.save(target_stem.with_name(f"{target_stem.name}.webp"), "WEBP", quality=WEBP_QUALITY, method=6)
    tile = photo.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS)
    tile.save(target_stem.with_name(f"{target_stem.name}-{TILE_SIZE}.webp"), "WEBP", quality=WEBP_QUALITY, method=6)


def build_contact_sheet(photos: list[Image.Image]) -> Image.Image:
    rows = -(-len(photos) // SHEET_COLUMNS)
    sheet = Image.new("RGB", (SHEET_COLUMNS * SHEET_TILE, rows * SHEET_TILE), "white")
    for index, photo in enumerate(photos):
        tile = photo.copy()
        tile.thumbnail((SHEET_TILE, SHEET_TILE), Image.Resampling.LANCZOS)
        sheet.paste(tile, ((index % SHEET_COLUMNS) * SHEET_TILE, (index // SHEET_COLUMNS) * SHEET_TILE))
    return sheet


if __name__ == "__main__":
    main()
