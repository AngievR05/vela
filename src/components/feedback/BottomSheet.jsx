"use client";
import { useEffect,useId,useRef } from "react";
import { X } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import styles from "@/components/design-system/DesignSystem.module.css";

function focusable(container){
  if(!container)return[];
  return Array.from(container.querySelectorAll('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'));
}
export default function BottomSheet({ open,title,children,actions,onClose,dismissOnBackdrop=true,showHandle=true,className="",backdropClassName="" }) {
  const titleId=useId(); const ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement; const sheet=ref.current; const items=focusable(sheet);
    (items[0]??sheet)?.focus?.();
    function key(e){
      if(e.key==="Escape"&&onClose){e.preventDefault();onClose();return}
      if(e.key!=="Tab")return;
      const list=focusable(sheet); if(!list.length)return;
      const first=list[0],last=list[list.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
    document.addEventListener("keydown",key);
    return()=>{document.removeEventListener("keydown",key);previous?.focus?.()}
  },[open,onClose]);
  if(!open)return null;
  return (
    <div className={[styles.sheetBackdrop,backdropClassName].filter(Boolean).join(" ")} onMouseDown={e=>{
      if(dismissOnBackdrop&&e.target===e.currentTarget)onClose?.();
    }}>
      <section ref={ref} className={[styles.sheet,className].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        {showHandle?<div className={styles.sheetHandle} aria-hidden="true"/>:null}
        <div className={styles.sheetHeader}>
          <h2 id={titleId} className={[styles.h2,styles.fill].join(" ")}>{title}</h2>
          {onClose?<IconButton icon={X} label="Close sheet" onClick={onClose}/>:null}
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {actions?<div className={styles.sheetActions}>{actions}</div>:null}
      </section>
    </div>
  );
}
