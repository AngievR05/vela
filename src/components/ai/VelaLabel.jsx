import { Sparkles } from "lucide-react";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function VelaLabel({ text="Vela AI" }) {
  return <span className={styles.aiLabel}><Sparkles size={14} aria-hidden="true" /><span>{text}</span></span>;
}
