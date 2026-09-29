"use client";
import { CheckCircle2,Info,AlertCircle } from "lucide-react";
import styles from "@/components/design-system/DesignSystem.module.css";
const ICONS={success:CheckCircle2,info:Info,error:AlertCircle};

export default function Toast({ message,type="info",actionLabel,onAction }) {
  const Icon=ICONS[type]??Info;
  return (
    <div className={styles.toast} role={type==="error"?"alert":"status"}
      aria-live={type==="error"?"assertive":"polite"}>
      <Icon size={20} aria-hidden="true"/>
      <span className={[styles.small,styles.fill].join(" ")}>{message}</span>
      {actionLabel?<button type="button" className={styles.toastAction} onClick={onAction}>{actionLabel}</button>:null}
    </div>
  );
}
