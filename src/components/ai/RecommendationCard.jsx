import BookCover from "@/components/books/BookCover";
import Button from "@/components/ui/Button";
import VelaLabel from "./VelaLabel";
import styles from "@/components/design-system/DesignSystem.module.css";

const MATCH_LABELS = { strong:"Strong match", good:"Good match", experimental:"Experimental" };

export default function RecommendationCard({
  title, author, coverSrc, reason, match="good", traits=[], detailHref, saveAction
}) {
  return (
    <article className={[styles.card,styles.featureCard,styles.recommendation].join(" ")}>
      <div className={styles.recommendationMain}>
        <BookCover title={title} author={author} src={coverSrc} size="card" decorative />
        <div className={styles.recommendationText}>
          <div className={[styles.actions,styles.wrap].join(" ")}>
            <VelaLabel text="Vela suggestion" />
            <span className={[styles.badge,styles.signalEmerging].join(" ")}>
              {MATCH_LABELS[match] ?? MATCH_LABELS.good}
            </span>
          </div>
          <h3 className={styles.h3}>{title}</h3>
          <p className={[styles.small,styles.muted].join(" ")}>{author}</p>
          <p className={styles.small}>{reason}</p>
          {traits.length ? (
            <div className={[styles.actions,styles.wrap].join(" ")} aria-label="Matching traits">
              {traits.map(trait => <span key={trait} className={styles.traitChip}>{trait}</span>)}
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.actions}>
        <Button href={detailHref} variant="secondary">View details</Button>
        {saveAction}
      </div>
    </article>
  );
}
