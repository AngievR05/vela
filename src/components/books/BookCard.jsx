import Link from "next/link";
import BookCover from "./BookCover";
import BookStatusControl from "./BookStatusControl";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function BookCard({ href, title, author, coverSrc, metadata, status, layout="vertical" }) {
  return (
    <Link href={href} className={[styles.card,styles.focusable,layout==="vertical"?styles.bookCardVertical:""].filter(Boolean).join(" ")}
      aria-label={`${title} by ${author}`}>
      <div className={layout==="horizontal" ? styles.row : styles.stack}>
        <BookCover title={title} author={author} src={coverSrc} size="card" decorative />
        <div className={[styles.stack,styles.fill].join(" ")}>
          <h3 className={styles.h3}>{title}</h3>
          <p className={[styles.small,styles.muted].join(" ")}>{author}</p>
          {metadata ? <p className={styles.caption}>{metadata}</p> : null}
          {status ? <BookStatusControl status={status} /> : null}
        </div>
      </div>
    </Link>
  );
}
