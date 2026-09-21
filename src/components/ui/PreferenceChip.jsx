"use client";

import { Check } from "lucide-react";
import styles from "./PrimitiveControls.module.css";

export default function PreferenceChip({
  children,
  selected = false,
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      className={[styles.chip, className].filter(Boolean).join(" ")}
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={[
          styles.chipVisual,
          selected ? styles.preferenceSelected : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {selected ? (
          <Check className={styles.chipIcon} aria-hidden="true" />
        ) : null}
        <span>{children}</span>
      </span>
    </button>
  );
}
