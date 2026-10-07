import BookCover from "./BookCover";
import LinearProgress from "@/components/ui/LinearProgress";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";
import Link from "next/link";

export default function CurrentlyReadingCard({ title, author, coverSrc, progress=0, progressText, updateHref, detailHref, onUpdate, className="", variant="default" }) {
  if (variant === "home") return <section className={className} aria-labelledby="currently-reading-title">
    <div data-part="summary">
      {detailHref ? <Link href={detailHref} aria-label={`Open ${title}`} data-part="cover"><BookCover size="current" title={title} author={author} src={coverSrc} decorative placeholderType="book" /></Link> : <BookCover size="current" title={title} author={author} src={coverSrc} decorative placeholderType="book" />}
      <div data-part="info"><p data-part="label">CURRENTLY READING</p>
        <h2 id="currently-reading-title">{detailHref ? <Link href={detailHref}>{title}</Link> : title}</h2>{author && <p data-part="author">{author}</p>}
        <Button onClick={onUpdate} href={updateHref} data-part="update">Update progress</Button>
      </div>
    </div>
    <div data-part="progress"><div><span>{progressText ?? `${progress}% complete`}</span><strong>{progress}%</strong></div>
      <LinearProgress value={progress} label={`Reading progress, ${progress}%`} />
    </div>
  </section>;
  return (
    <section className={styles.currentReading} aria-labelledby="currently-reading-title">
      <div className={[styles.row,styles.rowStart].join(" ")}>
        <BookCover size="current" title={title} author={author} src={coverSrc} decorative />
        <div className={[styles.stack,styles.fill].join(" ")}>
          <p className={styles.caption}>Currently reading</p>
          <h2 id="currently-reading-title" className={styles.h2}>{title}</h2>
          {author ? <p className={[styles.small,styles.muted].join(" ")}>{author}</p> : null}
          <p className={styles.small}>{progressText ?? `${progress}% complete`}</p>
          <LinearProgress value={progress} label={`Reading progress, ${progress}%`} />
        </div>
      </div>
      <div className={styles.actions}>
        <Button href={updateHref} variant="secondary">Update progress</Button>
        {detailHref ? <Button href={detailHref} variant="tertiary">View book</Button> : null}
      </div>
    </section>
  );
}
