import styles from "@/components/design-system/DesignSystem.module.css";
export default function Divider({ className="" }) {
  return <hr aria-hidden="true" className={[styles.divider, className].filter(Boolean).join(" ")} />;
}
