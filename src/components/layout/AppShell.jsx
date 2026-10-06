"use client";

import { usePathname } from "next/navigation";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import styles from "./AppShell.module.css";

export default function AppShell({
  children,
  header = null,
  showBottomNavigation = true,
  className = "",
}) {
  const home = usePathname() === "/home";
  return (
    <div
      className={[
        styles.shell,
        showBottomNavigation ? styles.withBottomNavigation : "",
        className,
        home ? styles.homeShell : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {header}

      <main className={styles.main} id="main-content">
        {children}
      </main>

      {showBottomNavigation && !home ? <BottomNavigation /> : null}
    </div>
  );
}
