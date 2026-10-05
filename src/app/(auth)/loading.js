import AuthScreen, { BrandLogo } from "@/components/auth/AuthScreen";
import styles from "@/components/auth/Auth.module.css";

export default function Loading() {
  return <AuthScreen folio="A.02">
    <div className={styles.statusBody}>
      <BrandLogo size={112} />
      <h1 className={styles.statusHeading}>Opening Vela…</h1>
      <p className={styles.statusCopy}>Checking your saved session and reading space.</p>
    </div>
    <div className={styles.loadingTrack} role="status" aria-label="Opening Vela" />
  </AuthScreen>;
}
