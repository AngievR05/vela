import { ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function PersonalisationOffState({ settingsHref="/settings", compact=false }) {
  if(compact) return (
    <div className={[styles.alert,styles.alertInfo].join(" ")} role="status">
      <ShieldCheck size={20} aria-hidden="true"/>
      <div className={[styles.stack,styles.fill].join(" ")}>
        <strong className={styles.label}>Personalisation is off</strong>
        <span className={styles.small}>Reading tracking still works. Reading DNA is not influencing suggestions.</span>
        <Button href={settingsHref} variant="tertiary">Manage personalisation</Button>
      </div>
    </div>
  );
  return (
    <section className={styles.state}>
      <div className={styles.stateInner}>
        <ShieldCheck className={styles.stateIcon} aria-hidden="true"/>
        <h2 className={styles.h2}>Personalisation is off</h2>
        <p className={styles.small}>You can keep using your Library and tracking reading. Vela will not use Reading DNA to personalise suggestions while this is off.</p>
        <Button href={settingsHref} width="fill">Manage personalisation</Button>
      </div>
    </section>
  );
}
