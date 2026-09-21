"use client";

import { LoaderCircle } from "lucide-react";
import styles from "./PrimitiveControls.module.css";

export default function Button({
  children,
  variant = "primary",
  width = "hug",
  loading = false,
  disabled = false,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  type = "button",
  className = "",
  ...props
}) {
  const variantClass = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    tertiary: styles.buttonTertiary,
    destructive: styles.buttonDestructive,
  }[variant];

  return (
    <button
      type={type}
      className={[
        styles.button,
        variantClass,
        width === "fill" ? styles.buttonFill : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle className={styles.buttonSpinner} aria-hidden="true" />
      ) : LeadingIcon ? (
        <LeadingIcon className={styles.icon} aria-hidden="true" />
      ) : null}

      <span>{children}</span>

      {!loading && TrailingIcon ? (
        <TrailingIcon className={styles.icon} aria-hidden="true" />
      ) : null}
    </button>
  );
}
