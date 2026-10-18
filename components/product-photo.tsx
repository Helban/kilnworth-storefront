"use client";

import { useCallback, useState } from "react";
import type { Product } from "@/lib/api/contract";
import { TILE_PHOTO_SIZE, tilePhotoSrc } from "@/lib/product-photos";

// thumb: the 400 file only (cart rows, 80 px). tile: the 400 file with the 800 file as its 2x
// source (catalog grids). large: both files with `sizes`, for photos shown wider than 400 px.
type PhotoLayout = "thumb" | "tile" | "large";

interface ProductPhotoProps {
  image: Product["image"];
  alt: string;
  layout: PhotoLayout;
  // Above the fold: load at once and skip the fade. A photo at opacity 0 does not count as
  // painted, so fading the largest image would push Largest Contentful Paint back to hydration.
  loading?: "eager" | "lazy";
  sizes?: string;
  className?: string;
}

export function ProductPhoto({ image, alt, layout, loading = "lazy", sizes, className = "" }: ProductPhotoProps) {
  const [loaded, setLoaded] = useState(false);
  // A cached photo can finish loading before React attaches onLoad; catch that case on mount.
  const catchEarlyLoad = useCallback((photo: HTMLImageElement | null) => {
    if (photo?.complete) setLoaded(true);
  }, []);

  const tileSrc = tilePhotoSrc(image.src);
  const sources =
    layout === "thumb"
      ? { src: tileSrc, srcSet: undefined, size: TILE_PHOTO_SIZE }
      : layout === "tile"
        ? { src: tileSrc, srcSet: `${tileSrc} 1x, ${image.src} 2x`, size: TILE_PHOTO_SIZE }
        : { src: image.src, srcSet: `${tileSrc} ${TILE_PHOTO_SIZE}w, ${image.src} ${image.width}w`, size: image.width };
  const fades = loading === "lazy";

  return (
    // next/image accepts no srcSet and emits only `src` when images are unoptimized, so the
    // 400/800 pair is chosen here by hand.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={fades ? catchEarlyLoad : undefined}
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={layout === "large" ? sizes : undefined}
      width={sources.size}
      height={sources.size}
      alt={alt}
      loading={loading}
      fetchPriority={loading === "eager" ? "high" : "auto"}
      decoding="async"
      onLoad={fades ? () => setLoaded(true) : undefined}
      className={`aspect-square w-full bg-line object-cover ${fades ? "transition-opacity duration-200" : ""} ${
        fades && !loaded ? "photo-waiting" : ""
      } ${className}`}
    />
  );
}
