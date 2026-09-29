"use client";
import { CloudOff, RefreshCcw, Sparkles, TriangleAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import styles from "@/components/design-system/DesignSystem.module.css";

const CONTENT={
  offline:{icon:CloudOff,title:"You’re offline",description:"Vela cannot reach online services right now. Your available Library content remains accessible."},
  ai:{icon:Sparkles,title:"Recommendations are unavailable",description:"Vela can’t reach recommendations right now. Your Library and reading tracking are still available."},
  error:{icon:TriangleAlert,title:"Something went wrong",description:"Vela could not load this content. Try again."},
};

export default function ErrorRecoveryState({ type="error", onRetry, secondaryLabel, secondaryHref }) {
  const config=CONTENT[type]??CONTENT.error; const Icon=config.icon;
  return (
    <section className={styles.state} role="alert">
      <div className={styles.stateInner}>
        <Icon className={styles.stateIcon} aria-hidden="true"/>
        <h2 className={styles.h2}>{config.title}</h2>
        <p className={styles.small}>{config.description}</p>
        <div className={styles.stateActions}>
          {onRetry?<Button onClick={onRetry} width="fill">Retry</Button>:null}
          {secondaryLabel&&secondaryHref?<Button href={secondaryHref} variant="secondary" width="fill">{secondaryLabel}</Button>:null}
        </div>
      </div>
    </section>
  );
}
