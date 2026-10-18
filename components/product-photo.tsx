import type { Product } from "@/lib/api/contract";
import { TILE_PHOTO_SIZE, tilePhotoSrc } from "@/lib/product-photos";
import { Photo } from "./photo";

// thumb: the 400 file only (cart rows, 80 px). tile: the 400 file with the 800 file as its 2x
// source (catalog grids). large: both files with `sizes`, for photos shown wider than 400 px.
type PhotoLayout = "thumb" | "tile" | "large";

interface ProductPhotoProps {
  image: Product["image"];
  alt: string;
  layout: PhotoLayout;
  loading?: "eager" | "lazy";
  sizes?: string;
  className?: string;
}

export function ProductPhoto({ image, alt, layout, loading, sizes, className = "" }: ProductPhotoProps) {
  const tileSrc = tilePhotoSrc(image.src);
  const sources =
    layout === "thumb"
      ? { src: tileSrc, srcSet: undefined, size: TILE_PHOTO_SIZE }
      : layout === "tile"
        ? { src: tileSrc, srcSet: `${tileSrc} 1x, ${image.src} 2x`, size: TILE_PHOTO_SIZE }
        : { src: image.src, srcSet: `${tileSrc} ${TILE_PHOTO_SIZE}w, ${image.src} ${image.width}w`, size: image.width };

  return (
    <Photo
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={layout === "large" ? sizes : undefined}
      width={sources.size}
      height={sources.size}
      alt={alt}
      loading={loading}
      className={`aspect-square w-full bg-line object-cover ${className}`}
    />
  );
}
