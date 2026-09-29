"use client";
import { useEffect,useId,useRef } from "react";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function ConfirmationDialog({
  open,title,description,confirmLabel,cancelLabel="Cancel",destructive=false,loading=false,onConfirm,onCancel
}) {
  const titleId=useId(),descriptionId=useId(),ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement;
    ref.current?.querySelector('[data-safe-action="true"]')?.focus?.();
    function key(e){if(e.key==="Escape")onCancel?.()}
    document.addEventListener("keydown",key);
    return()=>{document.removeEventListener("keydown",key);previous?.focus?.()}
  },[open,onCancel]);
  if(!open)return null;
  return (
    <div className={styles.dialogBackdrop}>
      <section ref={ref} className={styles.dialog} role="alertdialog" aria-modal="true"
        aria-labelledby={titleId} aria-describedby={descriptionId}>
        <h2 id={titleId} className={styles.h2}>{title}</h2>
        <p id={descriptionId} className={styles.small}>{description}</p>
        <div className={styles.stack}>
          <Button variant="secondary" onClick={onCancel} disabled={loading} data-safe-action="true">{cancelLabel}</Button>
          <Button variant={destructive?"destructive":"primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}
