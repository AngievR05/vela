"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

const REASONS = ["Wrong genre","Pacing does not matter","Not in the mood","Other"];

export default function RecommendationFeedback({ initialValue=null, onChange }) {
  const [value,setValue] = useState(initialValue);
  const [reason,setReason] = useState(null);

  function choose(next) {
    setValue(next);
    if (next !== "not_for_me") setReason(null);
    onChange?.({feedback:next,reason:next==="not_for_me"?reason:null});
  }
  function chooseReason(nextReason) {
    setReason(nextReason);
    onChange?.({feedback:"not_for_me",reason:nextReason});
  }

  return (
    <section className={styles.stack} aria-live="polite">
      <h3 className={styles.h3}>Was this useful?</h3>
      <div className={styles.feedbackActions}>
        <Button variant="secondary" className={value==="helpful"?styles.feedbackSelectedHelpful:""}
          onClick={()=>choose("helpful")}>Helpful</Button>
        <Button variant="secondary" className={value==="not_for_me"?styles.feedbackSelectedNo:""}
          onClick={()=>choose("not_for_me")}>Not for me</Button>
      </div>
      {value==="not_for_me" ? (
        <fieldset className={styles.stack}>
          <legend className={styles.label}>What felt off?</legend>
          <div className={[styles.actions,styles.wrap].join(" ")}>
            {REASONS.map(item => (
              <button key={item} type="button" className={[styles.statusButton,styles.focusable].join(" ")}
                aria-pressed={reason===item} onClick={()=>chooseReason(item)}>
                <span className={[styles.traitChip,reason===item?styles.signalEmerging:""].filter(Boolean).join(" ")}>
                  {reason===item ? <Check size={14} aria-hidden="true" /> : null}{item}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {value ? <p className={[styles.caption,styles.muted].join(" ")}>Feedback recorded. You can change it while you are on this screen.</p> : null}
    </section>
  );
}
