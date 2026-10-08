"use client";
import { useEffect,useId,useRef } from "react";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function ConfirmationDialog({
  open,title,description,confirmLabel,cancelLabel="Cancel",destructive=false,loading=false,onConfirm,onCancel,
  children,eyebrow,className="",backdropClassName="",confirmDisabled=false,confirmFirst=false
}) {
  const titleId=useId(),descriptionId=useId(),ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement;
    ref.current?.querySelector('[data-safe-action="true"]')?.focus?.();
    function key(e){
      if(e.key==="Escape")onCancel?.();
      if(e.key!=="Tab")return;
      const items=Array.from(ref.current?.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')||[]);
      if(!items.length){e.preventDefault();return;}
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    document.addEventListener("keydown",key);
    return()=>{document.removeEventListener("keydown",key);previous?.focus?.()}
  },[open,onCancel]);
  if(!open)return null;
  return (
    <div className={`${styles.dialogBackdrop} ${backdropClassName}`}>
      <section ref={ref} className={`${styles.dialog} ${className}`} role="alertdialog" aria-modal="true"
        aria-labelledby={titleId} aria-describedby={descriptionId}>
        {eyebrow&&<span>{eyebrow}</span>}
        <h2 id={titleId} className={styles.h2}>{title}</h2>
        <p id={descriptionId} className={styles.small}>{description}</p>
        {children}
        <div className={styles.stack}>
          {!confirmFirst&&<Button variant="secondary" onClick={onCancel} disabled={loading} data-safe-action="true">{cancelLabel}</Button>}
          <Button variant={destructive?"destructive":"primary"} onClick={onConfirm} loading={loading} disabled={confirmDisabled}>{confirmLabel}</Button>
          {confirmFirst&&<Button variant="secondary" onClick={onCancel} disabled={loading} data-safe-action="true">{cancelLabel}</Button>}
        </div>
      </section>
    </div>
  );
}
