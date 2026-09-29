import styles from "@/components/design-system/DesignSystem.module.css";

export default function RadioOption({
  id, name, value, label, supportingText, checked, onChange, disabled=false, destructive=false
}) {
  return (
    <label htmlFor={id} className={[
      styles.radioRow,
      checked ? styles.radioRowSelected : "",
      destructive ? styles.radioRowDanger : "",
    ].filter(Boolean).join(" ")}>
      <input id={id} className={styles.radioInput} type="radio" name={name} value={value}
        checked={checked} onChange={onChange} disabled={disabled} />
      <span className={styles.stack}>
        <span className={styles.label}>{label}</span>
        {supportingText ? <span className={[styles.caption, styles.muted].join(" ")}>{supportingText}</span> : null}
      </span>
    </label>
  );
}
