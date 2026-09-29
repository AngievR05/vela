import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function SettingsRow({ href, title, supportingText, value, leadingIcon, destructive=false }) {
  const Icon=leadingIcon;
  return (
    <Link href={href} className={[
      styles.settingsNavRow,
      supportingText?styles.settingsNavRowWithText:"",
      destructive?styles.destructiveText:"",
    ].filter(Boolean).join(" ")}>
      {Icon ? <Icon size={20} aria-hidden="true" /> : null}
      <div className={[styles.settingText,styles.fill].join(" ")}>
        <span className={styles.settingTitle}>{title}</span>
        {supportingText ? <span className={styles.settingDescription}>{supportingText}</span> : null}
      </div>
      {value ? <span className={styles.caption}>{value}</span> : null}
      <ChevronRight size={20} aria-hidden="true" />
    </Link>
  );
}
