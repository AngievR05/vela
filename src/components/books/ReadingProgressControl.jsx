"use client";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function ReadingProgressControl({
  mode="percent", onModeChange, value, onValueChange, maxPages, error, disabled=false
}) {
  const percentMode = mode === "percent";
  const summary = percentMode ? `${value || 0}% complete` : `Page ${value || 0}${maxPages ? ` of ${maxPages}` : ""}`;
  return (
    <div className={styles.stack}>
      <div className={styles.actions} role="tablist" aria-label="Progress format">
        <button type="button" role="tab" aria-selected={percentMode} className={styles.statusButton}
          onClick={() => onModeChange?.("percent")} disabled={disabled}>
          <span className={[styles.statusPill,percentMode?styles.statusReading:styles.statusWant].join(" ")}>Percentage</span>
        </button>
        <button type="button" role="tab" aria-selected={!percentMode} className={styles.statusButton}
          onClick={() => onModeChange?.("page")} disabled={disabled}>
          <span className={[styles.statusPill,!percentMode?styles.statusReading:styles.statusWant].join(" ")}>Page</span>
        </button>
      </div>
      <label className={styles.stack}>
        <span className={styles.label}>{percentMode ? "Progress percentage" : "Current page"}</span>
        <input type="number" min={0} max={percentMode?100:maxPages} value={value}
          onChange={(e)=>onValueChange?.(e.target.value)} disabled={disabled} aria-invalid={Boolean(error)}
          style={{width:"96px",minHeight:"52px",padding:"0 14px",borderRadius:"var(--radius-control)",
            border:error?"2px solid var(--colour-danger)":"1px solid var(--colour-input-border)",
            background:"var(--colour-paper)",color:"var(--colour-ink)"}} />
      </label>
      <p className={styles.small}>{summary}</p>
      {error ? <p className={[styles.caption,styles.destructiveText].join(" ")} role="alert">{error}</p> : null}
    </div>
  );
}
