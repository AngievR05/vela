import { AlertCircle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import styles from "@/components/design-system/DesignSystem.module.css";

const TYPES = {
  error:{icon:AlertCircle,className:styles.alertError},
  info:{icon:Info,className:styles.alertInfo},
  success:{icon:CheckCircle2,className:styles.alertSuccess},
  warning:{icon:CircleAlert,className:styles.alertWarning},
};

export default function InlineAlert({ type="info", title, children, action, className="" }) {
  const config = TYPES[type] ?? TYPES.info;
  const Icon = config.icon;
  return (
    <div className={[styles.alert, config.className, className].filter(Boolean).join(" ")}
      role={type === "error" ? "alert" : "status"}>
      <Icon size={20} aria-hidden="true" />
      <div className={[styles.stack, styles.fill].join(" ")}>
        {title ? <strong className={styles.label}>{title}</strong> : null}
        <div className={styles.small}>{children}</div>
        {action}
      </div>
    </div>
  );
}
