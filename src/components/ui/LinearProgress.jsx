import styles from "@/components/design-system/DesignSystem.module.css";

export default function LinearProgress({ value=0, label="Progress", className="" }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={[styles.progressTrack, className].filter(Boolean).join(" ")}
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={safeValue} aria-valuetext={`${safeValue}%`}>
      <div className={styles.progressFill} style={{ width: `${safeValue}%` }} />
    </div>
  );
}
