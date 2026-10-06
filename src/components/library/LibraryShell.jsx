"use client";
import Image from "next/image";
import Link from "next/link";
import { authBody, authDisplay } from "@/components/auth/fonts";
import { BrandLogo } from "@/components/auth/AuthScreen";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import styles from "./Library.module.css";
export default function LibraryShell({ children, title, subtitle, code, kind = "library", back, onBack, action }) {
  return <section className={`${styles.screen} ${kind === "add" ? styles.addScreen : ""} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    {kind !== "detail" && <div className={styles.art} aria-hidden="true"><span className={styles.spine} /><Image src={`/reading-library/arch-${kind === "add" ? "add" : "library"}.svg`} width={330} height={420} alt="" className={styles.arch} loading="eager" unoptimized /><span className={styles.folio}>{code}</span></div>}
    <div className={styles.content}>
      <header className={`${styles.header} ${kind !== "library" ? styles.subHeader : ""}`}>
        {back ? onBack ? <button type="button" className={styles.back} aria-label="Go back" onClick={onBack}>←</button> : <Link href={back} className={styles.back} aria-label="Back to Library">←</Link> : <BrandLogo size={28} />}
        <div><h1>{title}</h1><p>{subtitle}</p></div>{action || (kind !== "library" ? <BrandLogo size={32} /> : null)}
      </header>{children}
    </div>
    <BottomNavigation variant="home" activePath="/library" assetDirectory="reading-library" />
  </section>;
}
