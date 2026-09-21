import BottomNav from "@/components/navigation/BottomNav";
import styles from "./AppShell.module.css";

export default function AppShell({ children }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="/home" aria-label="Vela home">
          VELA
        </a>
        <span className={styles.tagline}>Your reading life, intelligently organised.</span>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
