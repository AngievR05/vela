import Link from "next/link";
import BookCover from "@/components/books/BookCover";
import styles from "@/components/design-system/DesignSystem.module.css";

const LABELS={rating:"Rating",dnf:"DNF",onboarding:"Chosen during setup",correction:"Correction"};

export default function ReadingDNAEvidenceRow({
  bookTitle, author, coverSrc, evidenceType, evidenceText, context, href
}) {
  const inner = (
    <>
      {bookTitle ? <BookCover size="evidence" title={bookTitle} author={author} src={coverSrc} decorative /> : null}
      <div className={[styles.stack,styles.fill].join(" ")}>
        {bookTitle ? <p className={styles.label}>{bookTitle}</p> : null}
        <span className={styles.evidenceBadge}>{evidenceText || LABELS[evidenceType] || "Evidence"}</span>
        {context ? <p className={[styles.caption,styles.muted].join(" ")}>{context}</p> : null}
      </div>
    </>
  );
  if (href) return <Link href={href} className={[styles.linkRow,styles.evidenceRow].join(" ")}>{inner}</Link>;
  return <div className={[styles.row,styles.evidenceRow].join(" ")}>{inner}</div>;
}
