import AuthScreen, { BrandLogo } from "./AuthScreen";
import InlineAlert from "@/components/ui/InlineAlert";
import styles from "./Auth.module.css";

export default function AuthStatus({ title, description, children, message, warning = false, tone = "green", folio = "A.11", logoSize = 112 }) {
  return <AuthScreen tone={tone} folio={folio}>
    <div className={styles.statusBody}>
      <BrandLogo size={logoSize} />
      <h1 className={styles.statusHeading}>{title}</h1>
      <p className={styles.statusCopy}>{description}</p>
    </div>
    <div className={styles.statusActions}>
      {message && <InlineAlert type={warning ? "warning" : "success"} className={`${styles.response} ${warning ? styles.responseWarning : styles.responseSuccess}`}>{message}</InlineAlert>}
      {children}
    </div>
  </AuthScreen>;
}
