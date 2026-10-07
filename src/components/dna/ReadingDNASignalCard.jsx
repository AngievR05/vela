import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "@/components/design-system/DesignSystem.module.css";

const STRENGTH = {
  strong:{label:"Strong signal",className:styles.signalStrong},
  emerging:{label:"Emerging signal",className:styles.signalEmerging},
  reduced:{label:"Reduced",className:styles.signalReduced},
  off:{label:"Do not use",className:styles.signalOff},
};

export default function ReadingDNASignalCard({
  trait, strength="emerging", sourceSummary, evidenceCount=0, href, personalisationOff=false, variant, className="", onClick, disabled=false
}) {
  const config = personalisationOff ? STRENGTH.off : STRENGTH[strength] ?? STRENGTH.emerging;
  if(variant==="dna")return <button type="button" className={className} onClick={onClick} disabled={disabled}><h3>{trait}</h3><p>{sourceSummary}</p></button>;
  const content = (
    <>
      <div className={styles.actions}>
        <span className={[styles.badge,config.className].join(" ")}>{config.label}</span>
        <span className={styles.badge}>{evidenceCount} {evidenceCount===1?"evidence item":"evidence items"}</span>
      </div>
      <h3 className={styles.h3}>{trait}</h3>
      {sourceSummary ? <p className={styles.small}>{sourceSummary}</p> : null}
      {personalisationOff ? <p className={[styles.caption,styles.muted].join(" ")}>This signal is viewable but is not influencing suggestions.</p> : null}
    </>
  );
  if (!href) return <article className={styles.card}>{content}</article>;
  return <Link href={href} className={[styles.card,styles.focusable].join(" ")}
    aria-label={`${trait}, ${config.label}`}>{content}<ChevronRight size={20} aria-hidden="true" /></Link>;
}
