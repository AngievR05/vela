import BottomNavigation from "@/components/navigation/BottomNavigation";
import styles from "./AppShell.module.css";

export default function AppShell({
  children,
  header = null,
  showBottomNavigation = true,
  className = "",
}) {
  return (
    <div
      className={[
        styles.shell,
        showBottomNavigation ? styles.withBottomNavigation : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {header}

      <main className={styles.main} id="main-content">
        {children}
      </main>

      {showBottomNavigation ? <BottomNavigation /> : null}
    </div>
  );
}
