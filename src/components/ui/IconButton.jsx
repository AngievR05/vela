"use client";

import styles from "./PrimitiveControls.module.css";

export default function IconButton({
  icon: Icon,
  label,
  variant = "neutral",
  selected = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) {
  if (!label) {
    throw new Error("Vela IconButton requires an accessible label.");
  }

  return (
    <button
      type={type}
      className={[
        styles.iconButton,
        variant === "destructive" ? styles.iconButtonDestructive : "",
        selected ? styles.iconButtonSelected : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      aria-pressed={selected || undefined}
      disabled={disabled}
      {...props}
    >
      <Icon className={styles.icon} aria-hidden="true" />
    </button>
  );
}
