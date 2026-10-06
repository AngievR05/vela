"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "@/components/design-system/DesignSystem.module.css";

const SIZE_CLASS = {
  list: styles.coverList,
  current: styles.coverCurrent,
  card: styles.coverCard,
  detail: styles.coverDetail,
  search: styles.coverSearch,
  evidence: styles.coverEvidence,
};

const IMAGE_SIZES = {
  list: "64px",
  current: "72px",
  card: "96px",
  detail: "120px",
  search: "56px",
  evidence: "40px",
};

function initials(title = "") {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    words
      .slice(0, 3)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "V"
  );
}

function normaliseImageUrl(src) {
  if (!src) return null;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  try {
    const url = new URL(src.replace(/^http:\/\//i, "https://"));
    return url.protocol === "https:" && ["books.google.com", "books.googleusercontent.com"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

export default function BookCover({
  title,
  author,
  src,
  size = "card",
  decorative = false,
  className = "",
  placeholderType = "initials",
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const alt = decorative
    ? ""
    : `${title || "Book"}${author ? ` by ${author}` : ""}`;

  const imageUrl = normaliseImageUrl(src);

  return (
    <div
      className={[
        styles.cover,
        SIZE_CLASS[size] ?? styles.coverCard,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {imageUrl && imageUrl !== failedSrc ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={IMAGE_SIZES[size] ?? "96px"}
          unoptimized
          onError={() => setFailedSrc(imageUrl)}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span
          className={styles.coverPlaceholder}
          aria-label={decorative ? undefined : alt}
          aria-hidden={decorative || undefined}
        >
          {placeholderType === "book" ? <><strong>{title}</strong><small>{author}</small></> : initials(title)}
        </span>
      )}
    </div>
  );
}
