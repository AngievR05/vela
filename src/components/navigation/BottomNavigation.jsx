"use client";

import { usePathname } from "next/navigation";
import { PRIMARY_NAVIGATION } from "@/lib/constants/navigation";
import BottomNavItem from "./BottomNavItem";
import styles from "./BottomNavigation.module.css";
import { authBody, authDisplay } from "@/components/auth/fonts";
import Link from "next/link";
import Image from "next/image";

function routeIsActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNavigation({ className = "", variant = "default", onNavigate, activePath, assetDirectory = "reading-home" }) {
  const pathname = usePathname();

  return (
    <nav
      className={[styles.wrapper, authBody.variable, authDisplay.variable, variant === "home" ? styles.floating : "", className].filter(Boolean).join(" ")}
      aria-label="Primary navigation"
    >
      <Link href="/home" className={styles.desktopBrand} onClick={event=>onNavigate?.(event,"/home")} aria-label="Vela Home">
        <Image src="/brand/logo.svg" width={42} height={40} alt="" unoptimized />
        <span>Vela<small>Your reading life</small></span>
      </Link>
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
      <p className={styles.desktopNote}>Read at your own pace.</p>
    </nav>
  );
}
