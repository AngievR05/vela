"use client";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function ConsentLearningPrompt({ state="unanswered", onAccept, onDecline }) {
  return (
    <section className={styles.consentPanel}>
      <h3 className={styles.h3}>Should Vela use this when suggesting books?</h3>
      <p className={styles.small}>This choice controls whether this reading signal can influence future recommendations.</p>
      {state==="unanswered" ? (
        <div className={styles.stack}>
          <Button onClick={onAccept}>Yes, use it</Button>
          <Button variant="secondary" onClick={onDecline}>Not this time</Button>
        </div>
      ) : (
        <p className={styles.label} role="status">
          {state==="accepted" ? "Vela can use this signal." : "This signal will not be used for suggestions."}
        </p>
      )}
    </section>
  );
}
