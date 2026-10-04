"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
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
  href,
  ...props
}) {
  const variantClass = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    tertiary: styles.buttonTertiary,
    destructive: styles.buttonDestructive,
  }[variant];

  const classNames = [
        styles.button,
        variantClass,
        width === "fill" ? styles.buttonFill : "",
        className,
      ]
        .filter(Boolean)
        .join(" ");
  const content = <>
      {loading ? (
        <LoaderCircle className={styles.buttonSpinner} aria-hidden="true" />
      ) : LeadingIcon ? (
        <LeadingIcon className={styles.icon} aria-hidden="true" />
      ) : null}

      <span>{children}</span>

      {!loading && TrailingIcon ? (
        <TrailingIcon className={styles.icon} aria-hidden="true" />
      ) : null}
    </>;
  if (href) {
    return <Link href={href} className={classNames} aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined} {...props}
      onClick={(event) => {
        if (disabled || loading) event.preventDefault();
        else props.onClick?.(event);
      }}>{content}</Link>;
  }
  return <button type={type} className={classNames} disabled={disabled || loading}
    aria-busy={loading || undefined} {...props}>{content}</button>;
}
