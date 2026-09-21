"use client";

import { Check, X } from "lucide-react";
import styles from "./PrimitiveControls.module.css";

export default function FilterChip({
  children,
  selected = false,
  removable = false,
  count,
  onClick,
  disabled = false,
  className = "",
}) {
  const StateIcon = selected ? (removable ? X : Check) : null;

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
          selected ? styles.filterSelected : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {StateIcon ? (
          <StateIcon className={styles.chipIcon} aria-hidden="true" />
        ) : null}
        <span>{children}</span>
        {count !== undefined && count !== null ? (
          <span aria-label={`${count} results`}>({count})</span>
        ) : null}
      </span>
    </button>
  );
}
