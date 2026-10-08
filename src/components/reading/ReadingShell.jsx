"use client";
import Link from "next/link";
import Image from "next/image";
import { authBody, authDisplay } from "@/components/auth/fonts";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import styles from "./Reading.module.css";
export default function ReadingShell({ title, subtitle, children, actions, onBack, overlay=false }) {
  return <section className={`${styles.screen} ${overlay?styles.overlay:""} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    <div className={styles.art} aria-hidden="true">
      <Image src="/reading-flow/blush-reading-arch.svg" width={330} height={420} alt="" className={styles.arch} unoptimized/>
      <Image src="/reading-flow/mist-pool.svg" width={430} height={440} alt="" className={styles.mist} unoptimized/>
      <Image src="/reading-flow/brass-orbit.svg" width={300} height={350} alt="" className={styles.orbit} unoptimized/>
    </div>
    <header className={styles.header}>{onBack?<button type="button" onClick={onBack} aria-label="Back">‹</button>:<Link href="/library" aria-label="Back to Library">‹</Link>}<h1>{title}</h1></header>
    <div className={`${styles.content} ${actions?styles.withActions:""}`}>{subtitle&&<p className={styles.subtitle}>{subtitle}</p>}{children}</div>
    {actions&&<div className={styles.actions}>{actions}</div>}
    <BottomNavigation className={styles.nav} variant="home" activePath="/library" assetDirectory="reading-flow"/>
  </section>;
}
