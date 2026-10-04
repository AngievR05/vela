import Image from "next/image";
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

  // Google Books sometimes returns HTTP cover URLs.
  // Next/Image should receive HTTPS in production.
  return src.replace(/^http:\/\//i, "https://");
}

export default function BookCover({
  title,
  author,
  src,
  size = "card",
  decorative = false,
  className = "",
}) {
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
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={IMAGE_SIZES[size] ?? "96px"}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span
          className={styles.coverPlaceholder}
          aria-label={decorative ? undefined : alt}
          aria-hidden={decorative || undefined}
        >
          {initials(title)}
        </span>
      )}
    </div>
  );
}