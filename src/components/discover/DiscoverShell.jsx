"use client";
import PageArtwork from "@/components/layout/PageArtwork";

import { authBody, authDisplay } from "@/components/auth/fonts";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import BackIcon from "@/components/navigation/BackIcon";
import styles from "./Discover.module.css";
export default function DiscoverShell({ title, subtitle, onBack, children, showNavigation=true }) {
  return <section className={`${styles.screen} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    <PageArtwork />
    <div className={`${styles.viewport} ${!showNavigation?styles.fullViewport:""}`}><div className={styles.content}><header className={styles.header}>{onBack&&<button type="button" onClick={onBack} className={styles.back} aria-label="Go back"><BackIcon /></button>}<div><h1>{title}</h1><p>{subtitle}</p></div></header>{children}</div></div>
    {showNavigation&&<BottomNavigation variant="home" activePath="/discover" assetDirectory="reading-discover"/>}
  </section>;
}
