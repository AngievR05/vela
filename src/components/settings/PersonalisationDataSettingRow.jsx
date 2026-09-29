import styles from "@/components/design-system/DesignSystem.module.css";
export default function PersonalisationDataSettingRow({ title, description, control, statusNote }) {
  return (
    <div className={styles.settingRow}>
      <div className={styles.settingText}>
        <p className={styles.settingTitle}>{title}</p>
        <p className={styles.settingDescription}>{description}</p>
        {statusNote ? <p className={[styles.caption,styles.muted].join(" ")}>{statusNote}</p> : null}
      </div>
      {control}
    </div>
  );
}
