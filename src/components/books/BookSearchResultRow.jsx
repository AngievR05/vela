"use client";
import BookCover from "./BookCover";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function BookSearchResultRow({
  title, author, coverSrc, metadata, alreadyAdded=false, existingStatus, onAdd, adding=false
}) {
  return (
    <div className={[styles.row,styles.searchRow,styles.rowStart].join(" ")}>
      <BookCover size="search" title={title} author={author} src={coverSrc} decorative />
      <div className={[styles.stack,styles.fill].join(" ")}>
        <h3 className={styles.h3}>{title}</h3>
        <p className={[styles.small,styles.muted].join(" ")}>{author}</p>
        {metadata ? <p className={styles.caption}>{metadata}</p> : null}
        {alreadyAdded ? <p className={styles.label}>In Library{existingStatus ? ` · ${existingStatus}` : ""}</p> : null}
      </div>
      {!alreadyAdded ? <Button variant="secondary" onClick={onAdd} loading={adding} disabled={adding}>Add</Button> : null}
    </div>
  );
}
