"use client";

import { AlertCircle } from "lucide-react";
import { useId } from "react";
import styles from "./PrimitiveControls.module.css";

export default function TextField({
  label,
  helperText,
  error,
  leadingIcon: LeadingIcon,
  trailingAction,
  id,
  disabled = false,
  readOnly = false,
  className = "",
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id ?? `vela-field-${generatedId}`;
  const messageId = `${inputId}-message`;
  const hasMessage = Boolean(error || helperText);

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        {label}
      </label>

      <div
        className={[
          styles.fieldRow,
          error ? styles.fieldRowError : "",
          disabled ? styles.fieldRowDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {LeadingIcon ? (
          <LeadingIcon className={styles.icon} aria-hidden="true" />
        ) : null}

        <input
          id={inputId}
          className={styles.input}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          {...inputProps}
        />

        {trailingAction ? (
          <div className={styles.trailingAction}>{trailingAction}</div>
        ) : null}
      </div>

      {hasMessage ? (
        <p
          id={messageId}
          className={[
            styles.fieldMessage,
            error ? styles.fieldError : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role={error ? "alert" : undefined}
        >
          {error ? <AlertCircle size={14} aria-hidden="true" /> : null}
          <span>{error || helperText}</span>
        </p>
      ) : null}
    </div>
  );
}
