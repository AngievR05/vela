import styles from "@/components/design-system/DesignSystem.module.css";

export default function Checkbox({ id, label, supportingText, checked, onChange, disabled=false, name, value }) {
  return (
    <label className={styles.checkboxRow} htmlFor={id}>
      <input id={id} name={name} value={value} type="checkbox"
        className={styles.checkboxInput} checked={checked} onChange={onChange} disabled={disabled} />
      <span className={styles.stack}>
        <span className={styles.label}>{label}</span>
        {supportingText ? <span className={[styles.caption, styles.muted].join(" ")}>{supportingText}</span> : null}
      </span>
    </label>
  );
}
