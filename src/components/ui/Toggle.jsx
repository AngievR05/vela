"use client";

import { LoaderCircle } from "lucide-react";
import { useId } from "react";
import styles from "./PrimitiveControls.module.css";

export default function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  loading = false,
  id,
  name,
  className = "",
}) {
  const generatedId = useId();
  const inputId = id ?? `vela-toggle-${generatedId}`;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={[styles.settingRow, className].filter(Boolean).join(" ")}>
      <label className={styles.settingCopy} htmlFor={inputId}>
        <span className={styles.settingLabel}>{label}</span>
        {description ? (
          <span id={descriptionId} className={styles.settingDescription}>
            {description}
          </span>
        ) : null}
      </label>

      <span className={styles.toggleWrap}>
        <input
          id={inputId}
          name={name}
          type="checkbox"
          role="switch"
          className={styles.toggleInput}
          checked={checked}
          onChange={onChange}
          disabled={disabled || loading}
          aria-describedby={description ? descriptionId : undefined}
          aria-busy={loading || undefined}
        />

        <label className={styles.toggleTrack} htmlFor={inputId}>
          <span className={styles.toggleThumb} />
        </label>

        {loading ? (
          <span className={styles.toggleSaving} aria-hidden="true">
            <LoaderCircle className={styles.toggleSpinner} />
          </span>
        ) : null}
      </span>
    </div>
  );
}
