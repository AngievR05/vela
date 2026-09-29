import styles from "@/components/design-system/DesignSystem.module.css";

export default function BookMetadataRow({ label, value, orientation="horizontal", icon }) {
  return (
    <div className={[styles.metadataRow,orientation==="vertical"?styles.metadataVertical:""].filter(Boolean).join(" ")}>
      {icon}<span className={styles.metaLabel}>{label}</span><span className={styles.metaValue}>{value}</span>
    </div>
  );
}
