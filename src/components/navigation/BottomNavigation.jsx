"use client";

import { usePathname } from "next/navigation";
import { PRIMARY_NAVIGATION } from "@/lib/constants/navigation";
import BottomNavItem from "./BottomNavItem";
import styles from "./BottomNavigation.module.css";
import { authBody } from "@/components/auth/fonts";

function routeIsActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNavigation({ className = "", variant = "default", onNavigate, activePath, assetDirectory = "reading-home" }) {
  const pathname = usePathname();

  return (
    <nav
      className={[styles.wrapper, variant === "home" ? `${styles.floating} ${authBody.variable}` : "", className].filter(Boolean).join(" ")}
      aria-label="Primary navigation"
    >
      <div className={styles.navigation}>
        {PRIMARY_NAVIGATION.map((item) => (
          <BottomNavItem
            key={item.href}
            {...item}
            active={routeIsActive(activePath || pathname, item.href)}
            iconSrc={variant === "home" ? `/${assetDirectory}/nav-${item.label.toLowerCase()}.svg` : undefined}
            onClick={(event) => onNavigate?.(event, item.href)}
          />
        ))}
      </div>
      <div className={styles.safeArea} aria-hidden="true" />
    </nav>
  );
}
