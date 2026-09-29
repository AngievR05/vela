import styles from "@/components/design-system/DesignSystem.module.css";

export default function OnboardingStepIndicator({ current, total, className="" }) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeCurrent = Math.min(safeTotal, Math.max(1, Number(current) || 1));
  const percent = (safeCurrent / safeTotal) * 100;
  return (
    <div className={[styles.stepIndicator, className].filter(Boolean).join(" ")}
      aria-label={`Step ${safeCurrent} of ${safeTotal}`}>
      <span className={styles.caption}>Step {safeCurrent} of {safeTotal}</span>
      <div className={styles.stepTrack} aria-hidden="true">
        <div className={styles.stepFill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
