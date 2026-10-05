import Image from "next/image";
import Link from "next/link";
import { authBody, authDisplay } from "./fonts";
import styles from "./Auth.module.css";

export function BrandLogo({ size = 108, className = "" }) {
  const scale = size / 108;
  return <span className={`${styles.logo} ${className}`} style={{ width: size, height: 104 * scale }}>
    <Image src="/brand/logo.svg" alt="Vela" width={108} height={104} priority unoptimized
      style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} />
  </span>;
}

export default function AuthScreen({ children, tone = "brass", folio = "A.05", className = "" }) {
  return <main className={`${styles.screen} ${styles[tone]} ${authBody.variable} ${authDisplay.variable} ${className}`}>
    <div className={styles.art} aria-hidden="true">
      <Image className={styles.colourField} src={`/auth/field-${tone}.svg`} alt="" width={250} height={250} unoptimized />
      <span className={styles.folio}>{folio}</span>
      <Image className={styles.arch} src={`/auth/arch-${tone}.svg`} alt="" width={344} height={470} unoptimized />
      <span className={styles.spine} />
      <span className={styles.bookmark} />
      <Image className={styles.fold} src="/auth/fold.svg" alt="" width={36} height={36} unoptimized />
    </div>
    <div className={styles.content}>{children}</div>
  </main>;
}

export function AuthNavigation({ label, href = "/welcome", backLabel = "Back to welcome" }) {
  return <nav className={styles.navigation} aria-label="Account navigation">
    <Link href={href} className={styles.back} aria-label={backLabel}>
      <Image src="/auth/back.svg" alt="" width={24} height={24} unoptimized />
    </Link>
    <p>{label}</p>
  </nav>;
}

export function AuthHeading({ kicker, children, description }) {
  return <header className={styles.headingGroup}>
    <p className={styles.kicker}>{kicker}</p>
    <h1 className={styles.heading}>{children}</h1>
    <p className={styles.description}>{description}</p>
  </header>;
}
