"use client";
import PageArtwork from "@/components/layout/PageArtwork";

import Link from "next/link";
import { authBody, authDisplay } from "@/components/auth/fonts";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import BackIcon from "@/components/navigation/BackIcon";
import styles from "./Reading.module.css";
export default function ReadingShell({ title, subtitle, children, actions, onBack, overlay=false }) {
  return <section className={`${styles.screen} ${overlay?styles.overlay:""} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    <PageArtwork />
    <header className={styles.header}>{onBack?<button type="button" onClick={onBack} aria-label="Back"><BackIcon /></button>:<Link href="/library" aria-label="Back to Library"><BackIcon /></Link>}<h1>{title}</h1></header>
    <div className={`${styles.content} ${actions?styles.withActions:""}`}>{subtitle&&<p className={styles.subtitle}>{subtitle}</p>}{children}</div>
    {actions&&<div className={styles.actions}>{actions}</div>}
    <BottomNavigation className={styles.nav} variant="home" activePath="/library" assetDirectory="reading-flow"/>
  </section>;
}
