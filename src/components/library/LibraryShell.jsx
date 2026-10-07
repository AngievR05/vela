"use client";
import Image from "next/image";
import Link from "next/link";
import { authBody, authDisplay } from "@/components/auth/fonts";
import { BrandLogo } from "@/components/auth/AuthScreen";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import styles from "./Library.module.css";
export default function LibraryShell({ children, title, subtitle, kind = "library", back, onBack, action }) {
  return <section className={`${styles.screen} ${kind === "add" ? styles.addScreen : ""} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    <div className={styles.art} aria-hidden="true"><span className={styles.spine} /><span className={styles.rule} /><Image src="/reading-discover/blush-reading-arch.svg" width={330} height={420} alt="" className={styles.arch} loading="eager" unoptimized /><Image src="/reading-discover/mist-pool.svg" width={430} height={440} alt="" className={styles.wash} loading="eager" unoptimized /><Image src="/reading-discover/brass-orbit.svg" width={300} height={350} alt="" className={styles.orbit} loading="eager" unoptimized /></div>
    <div className={styles.viewport}><div className={styles.content}>
      <header className={`${styles.header} ${kind !== "library" ? styles.subHeader : ""}`}>
        {back ? onBack ? <button type="button" className={styles.back} aria-label="Go back" onClick={onBack}>←</button> : <Link href={back} className={styles.back} aria-label="Back to Library">←</Link> : null}
        <div><h1>{title}</h1><p>{subtitle}</p></div>{action || (kind === "add" ? <BrandLogo size={44} /> : null)}
      </header>{children}
    </div></div>
    <BottomNavigation variant="home" activePath="/library" assetDirectory="reading-library" />
  </section>;
}
