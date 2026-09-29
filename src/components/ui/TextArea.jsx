import styles from "@/components/design-system/DesignSystem.module.css";

export default function TextArea({ id, label, helperText, error, optional=false, className="", ...props }) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className={[styles.textareaWrapper, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.label}>
        {label}{optional ? " (Optional)" : ""}
      </label>
      <textarea
        id={id}
        className={[styles.textarea, error ? styles.textareaError : ""].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helpId : undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} className={[styles.caption, styles.destructiveText].join(" ")}>{error}</p>
      ) : helperText ? (
        <p id={helpId} className={[styles.caption, styles.muted].join(" ")}>{helperText}</p>
      ) : null}
    </div>
  );
}
