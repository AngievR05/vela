import styles from "@/components/design-system/DesignSystem.module.css";

const SIZE_CLASS = {
  list:styles.coverList, current:styles.coverCurrent, card:styles.coverCard,
  detail:styles.coverDetail, search:styles.coverSearch, evidence:styles.coverEvidence,
};
function initials(title="") {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return words.slice(0,3).map(word => word[0]?.toUpperCase()).join("") || "V";
}
export default function BookCover({ title, author, src, size="card", decorative=false, className="" }) {
  const alt = decorative ? "" : `${title || "Book"}${author ? ` by ${author}` : ""}`;
  return (
    <div className={[styles.cover, SIZE_CLASS[size] ?? styles.coverCard, className].filter(Boolean).join(" ")}>
      {src ? <img src={src} alt={alt} /> : (
        <span className={styles.coverPlaceholder} aria-label={decorative ? undefined : alt}
          aria-hidden={decorative || undefined}>{initials(title)}</span>
      )}
    </div>
  );
}
