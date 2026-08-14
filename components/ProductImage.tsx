"use client";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { ProductArt } from "./ProductArt";

/**
 * Shows the seller's photo when there is one. Falls back to category artwork
 * if the field is empty or the file 404s, so a listing never renders broken.
 */
export function ProductImage({
  src,
  alt,
  category,
  seed,
  className = "",
}: {
  src?: string;
  alt: string;
  category: Category;
  seed: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed)
    return <ProductArt category={category} seed={seed} className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
