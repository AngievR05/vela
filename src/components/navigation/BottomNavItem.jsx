"use client";

import Link from "next/link";
import styles from "./BottomNavigation.module.css";

export default function BottomNavItem({
  href,
  label,
  icon: Icon,
  active = false,
}) {
  return (
    <Link
      href={href}
      className={[
        styles.item,
        active ? styles.itemActive : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span className={styles.activeIndicator} aria-hidden="true" />
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
