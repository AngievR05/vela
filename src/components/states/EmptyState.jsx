import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function EmptyState({
  icon, title, description, primaryLabel, primaryHref, primaryAction, secondaryLabel, secondaryHref
}) {
  const Icon=icon;
  return (
    <section className={styles.state}>
      <div className={styles.stateInner}>
        {Icon?<Icon className={styles.stateIcon} aria-hidden="true"/>:null}
        <h2 className={styles.h2}>{title}</h2>
        <p className={styles.small}>{description}</p>
        {(primaryLabel||secondaryLabel)?(
          <div className={styles.stateActions}>
            {primaryLabel ? (
              primaryHref ? <Button href={primaryHref} width="fill">{primaryLabel}</Button>
              : <Button onClick={primaryAction} width="fill">{primaryLabel}</Button>
            ):null}
            {secondaryLabel&&secondaryHref?(
              <Button href={secondaryHref} variant="secondary" width="fill">{secondaryLabel}</Button>
            ):null}
          </div>
        ):null}
      </div>
    </section>
  );
}
