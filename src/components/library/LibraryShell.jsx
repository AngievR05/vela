"use client";
import PageArtwork from "@/components/layout/PageArtwork";

import Image from "next/image";
import Link from "next/link";
import { authBody, authDisplay } from "@/components/auth/fonts";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import BackIcon from "@/components/navigation/BackIcon";
import styles from "./Library.module.css";
export default function LibraryShell({ children, title, subtitle, kind = "library", back, onBack, action }) {
  return <section className={`${styles.screen} ${kind === "add" ? styles.addScreen : ""} ${authBody.variable} ${authDisplay.variable}`} aria-label={title} data-kind={kind}>
    <PageArtwork />
    <div className={styles.viewport}><div className={styles.content}>
      <header className={`${styles.header} ${kind !== "library" ? styles.subHeader : ""}`}>
        {kind==="library"&&<Image src="/reading-library/logo.svg" width={28} height={27} alt="Vela" unoptimized className={styles.libraryLogo}/>}
        {back ? onBack ? <button type="button" className={styles.back} aria-label="Go back" onClick={onBack}><BackIcon /></button> : <Link href={back} className={styles.back} aria-label="Back to Library"><BackIcon /></Link> : null}
        <div><h1>{title}</h1><p>{subtitle}</p></div>{action || (kind === "add" ? <span className={styles.addLogo}><Image src="/reading-library/add-logo.svg" width={44} height={42} alt="Vela" unoptimized className={styles.addLogoAsset}/></span> : null)}
      </header>{children}
    </div></div>
    <BottomNavigation variant="home" activePath="/library" assetDirectory="reading-library" />
  </section>;
}
