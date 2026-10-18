"use client";

import { useCallback, useState } from "react";

interface PhotoProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  width: number;
  height: number;
  alt: string;
  // Above the fold: load at once and skip the fade. A photo at opacity 0 does not count as
  // painted, so fading the largest image would push Largest Contentful Paint back to hydration.
  loading?: "eager" | "lazy";
  className?: string;
}

// A plain <img> that fades in once loaded. next/image accepts no srcSet and emits only `src` when
// images are unoptimized, so callers pick their own sources.
export function Photo({ src, srcSet, sizes, width, height, alt, loading = "lazy", className = "" }: PhotoProps) {
  const [loaded, setLoaded] = useState(false);
  // A cached photo can finish loading before React attaches onLoad; catch that case on mount.
  const catchEarlyLoad = useCallback((photo: HTMLImageElement | null) => {
    if (photo?.complete) setLoaded(true);
  }, []);
  const fades = loading === "lazy";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={fades ? catchEarlyLoad : undefined}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={loading}
      fetchPriority={loading === "eager" ? "high" : "auto"}
      decoding="async"
      onLoad={fades ? () => setLoaded(true) : undefined}
      className={`${fades ? "transition-opacity duration-200" : ""} ${fades && !loaded ? "photo-waiting" : ""} ${className}`}
    />
  );
}
