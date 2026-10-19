"use client";
import PageArtwork from "@/components/layout/PageArtwork";

import {authBody,authDisplay} from "@/components/auth/fonts";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import BackIcon from "@/components/navigation/BackIcon";
import styles from "./Settings.module.css";
export default function SettingsShell({title,subtitle,onBack,children,showNavigation=true,view}){
  return <section className={`${styles.screen} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    <PageArtwork />
    <div className={styles.content} data-view={view}><header className={styles.header}>{onBack&&<button type="button" onClick={onBack} className={styles.back} aria-label="Go back"><BackIcon /></button>}<div><h1>{title}</h1><p>{subtitle}</p></div></header>{children}</div>
    {showNavigation&&<BottomNavigation variant="home" assetDirectory="reading-settings" activePath="/settings"/>}
  </section>;
}
