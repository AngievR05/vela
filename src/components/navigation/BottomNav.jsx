"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Sparkles, Dna, Settings } from "lucide-react";
import styles from "./BottomNav.module.css";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/dna", label: "DNA", icon: Dna },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
