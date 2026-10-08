"use client";
import Image from "next/image";
import {authBody,authDisplay} from "@/components/auth/fonts";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import styles from "./Settings.module.css";
export default function SettingsShell({title,subtitle,onBack,children,showNavigation=true,view}){
  return <section className={`${styles.screen} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    <div className={styles.art} aria-hidden="true"><span className={styles.spine}/><span className={styles.rule}/><Image src="/reading-settings/blush-reading-arch.svg" width={330} height={420} alt="" unoptimized className={styles.arch}/><Image src="/reading-settings/mist-pool.svg" width={430} height={440} alt="" unoptimized className={styles.wash}/><Image src="/reading-settings/brass-orbit.svg" width={300} height={350} alt="" unoptimized className={styles.orbit}/></div>
    <div className={styles.content} data-view={view}><header className={styles.header}>{onBack&&<button type="button" onClick={onBack} className={styles.back} aria-label="Go back">←</button>}<div><h1>{title}</h1><p>{subtitle}</p></div></header>{children}</div>
    {showNavigation&&<BottomNavigation variant="home" assetDirectory="reading-settings" activePath="/settings"/>}
  </section>;
}
