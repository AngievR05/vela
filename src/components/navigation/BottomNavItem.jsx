"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./BottomNavigation.module.css";

export default function BottomNavItem({
  href,
  label,
  icon: Icon,
  active = false,
  iconSrc,
  onClick,
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
      onClick={onClick}
    >
      <span className={styles.activeIndicator} aria-hidden="true" />
      {iconSrc ? <Image src={iconSrc} width={20} height={20} alt="" unoptimized /> : <Icon className={styles.icon} aria-hidden="true" />}
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
