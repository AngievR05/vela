import Link from "next/link";
import BookCover from "./BookCover";
import BookStatusControl from "./BookStatusControl";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function BookListItem({ href, title, author, coverSrc, status, metadata, trailingAction }) {
  return (
    <div className={[styles.row,styles.bookList,styles.rowStart].join(" ")}>
      <Link href={href} className={[styles.linkRow,styles.fill].join(" ")}
        aria-label={`${title} by ${author}. ${status || ""}`}>
        <BookCover size="list" title={title} author={author} src={coverSrc} decorative />
        <div className={[styles.stack,styles.fill].join(" ")}>
          <h3 className={styles.h3}>{title}</h3>
          <p className={[styles.small,styles.muted].join(" ")}>{author}</p>
          {status ? <BookStatusControl status={status} /> : null}
          {metadata ? <p className={[styles.caption,styles.muted].join(" ")}>{metadata}</p> : null}
        </div>
      </Link>
      {trailingAction}
    </div>
  );
}
