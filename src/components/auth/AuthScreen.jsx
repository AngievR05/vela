import Image from "next/image";
import Link from "next/link";
import { authBody, authDisplay } from "./fonts";
import styles from "./Auth.module.css";

export function BrandLogo({ size = 108, className = "", variant }) {
  const scale = size / 108;
  if (variant) return <Image className={`${styles.logo} ${className}`} src={`/auth/final-${variant}.svg`} alt="Vela" width={size} height={size * 0.95899} style={{ width: size, height: "auto" }} priority unoptimized />;
  return <span className={`${styles.logo} ${className}`} style={{ width: size, height: 104 * scale }}>
    <Image src="/brand/logo.svg" alt="Vela" width={108} height={104} priority unoptimized
      style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} />
  </span>;
}

export default function AuthScreen({ children, tone = "brass", className = "" }) {
  return <main className={`${styles.screen} ${styles[tone] || ""} ${authBody.variable} ${authDisplay.variable} ${className}`}>
    <div className={styles.art} aria-hidden="true">
      <Image className={styles.arch} src="/reading-discover/blush-reading-arch.svg" alt="" width={330} height={420} loading="eager" unoptimized />
      <Image className={styles.colourField} src="/reading-discover/mist-pool.svg" alt="" width={430} height={440} unoptimized />
      <Image className={styles.orbit} src="/reading-discover/brass-orbit.svg" alt="" width={300} height={350} loading="eager" unoptimized />
      <span className={styles.spine} />
      <span className={styles.innerRule} />
    </div>
    <div className={styles.content}>{children}</div>
  </main>;
}

export function AuthNavigation({ label, href = "/welcome", backLabel = "Back to welcome" }) {
  return <nav className={styles.navigation} aria-label="Account navigation">
    <Link href={href} className={styles.back} aria-label={backLabel}>
      <Image src="/auth/final-back.svg" alt="" width={24} height={24} unoptimized />
    </Link>
    <p>{label}</p>
  </nav>;
}

export function AuthHeading({ children, description }) {
  return <header className={styles.headingGroup}>
    <h1 className={styles.heading}>{children}</h1>
    <p className={styles.description}>{description}</p>
  </header>;
}
