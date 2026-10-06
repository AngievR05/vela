"use client";
import Image from "next/image";
import {authBody,authDisplay} from "@/components/auth/fonts";
import {BrandLogo} from "@/components/auth/AuthScreen";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import styles from "./Settings.module.css";
export default function SettingsShell({title,subtitle,onBack,children,showNavigation=true}){
  return <section className={`${styles.screen} ${authBody.variable} ${authDisplay.variable}`} aria-label={title}>
    <div className={styles.art} aria-hidden="true"><span className={styles.spine}/><Image src="/reading-settings/arch.svg" width={330} height={420} alt="" unoptimized className={styles.arch}/><Image src="/reading-settings/wash.svg" width={230} height={230} alt="" unoptimized className={styles.wash}/><span className={styles.folio}>C01</span></div>
    <div className={styles.content}><header className={styles.header}>{onBack&&<button type="button" onClick={onBack} className={styles.back} aria-label="Go back">←</button>}<div><h1>{title}</h1><p>{subtitle}</p></div><BrandLogo size={32}/></header>{children}</div>
    {showNavigation&&<BottomNavigation variant="home" assetDirectory="reading-settings" activePath="/settings"/>}
  </section>;
}
