"use client";
import { useId, useState } from "react";
import Button from "@/components/ui/Button";
import Divider from "@/components/ui/Divider";
import VelaLabel from "./VelaLabel";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function AIExplanationPanel({
  summary, bookEvidence=[], dnaEvidence=[], defaultExpanded=true, onCorrect, unavailable=false
}) {
  const [expanded,setExpanded] = useState(defaultExpanded);
  const contentId = useId();

  if (unavailable) return (
    <section className={[styles.card,styles.featureCard].join(" ")}>
      <VelaLabel /><h2 className={styles.h2}>Why Vela suggested this</h2>
      <p className={styles.small}>Vela cannot produce a reliable explanation for this suggestion right now.</p>
    </section>
  );

  return (
    <section className={[styles.card,styles.featureCard].join(" ")}>
      <div className={styles.actions}>
        <VelaLabel />
        <Button variant="tertiary" aria-expanded={expanded} aria-controls={contentId}
          onClick={()=>setExpanded(v=>!v)}>{expanded ? "Hide explanation" : "Show explanation"}</Button>
      </div>
      <h2 className={styles.h2}>Why Vela suggested this</h2>
      {summary ? <p className={styles.small}>{summary}</p> : null}
      {expanded ? (
        <div id={contentId} className={styles.stack}>
          <Divider />
          <section className={styles.explanationSection}>
            <h3 className={[styles.label,styles.bookEvidenceTitle].join(" ")}>From the book</h3>
            {bookEvidence.map(item => <p key={item} className={styles.small}>{item}</p>)}
          </section>
          <section className={styles.explanationSection}>
            <h3 className={[styles.label,styles.dnaEvidenceTitle].join(" ")}>From your Reading DNA</h3>
            {dnaEvidence.map(item => <p key={item} className={styles.small}>{item}</p>)}
          </section>
          {onCorrect ? <Button variant="secondary" onClick={onCorrect}>Correct Reading DNA</Button> : null}
        </div>
      ) : null}
    </section>
  );
}
