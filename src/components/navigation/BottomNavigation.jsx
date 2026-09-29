"use client";

import { usePathname } from "next/navigation";
import { PRIMARY_NAVIGATION } from "@/lib/constants/navigation";
import BottomNavItem from "./BottomNavItem";
import styles from "./BottomNavigation.module.css";

function routeIsActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNavigation({ className = "" }) {
  const pathname = usePathname();

  return (
    <nav
      className={[styles.wrapper, className].filter(Boolean).join(" ")}
      aria-label="Primary navigation"
    >
      <div className={styles.navigation}>
        {PRIMARY_NAVIGATION.map((item) => (
          <BottomNavItem
            key={item.href}
            {...item}
            active={routeIsActive(pathname, item.href)}
          />
        ))}
      </div>
      <div className={styles.safeArea} aria-hidden="true" />
    </nav>
  );
}
