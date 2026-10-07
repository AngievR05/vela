import AuthScreen, { BrandLogo } from "./AuthScreen";
import Button from "@/components/ui/Button";
import styles from "./Auth.module.css";

const benefits = [
  ["01", "TRACK", "One calm Library"],
  ["02", "REVIEW", "Your Reading DNA"],
  ["03", "CHOOSE", "Three clear matches"],
];

export default function WelcomeScreen() {
  return <AuthScreen tone="brass" folio="A.05" className={styles.welcome}>
    <BrandLogo size={42} variant="welcome" className={styles.welcomeLogo} />
    <p className={styles.welcomeKicker}>WELCOME TO VELA</p>
    <h1 className={styles.welcomeHeading}>Your reading life,<br /> intelligently organised.</h1>
    <p className={styles.description}>Track books, understand your editable Reading DNA and receive recommendations that explain their reasoning.</p>
    <div className={styles.benefits}>
      {benefits.map(([number, label, description]) => <div className={styles.benefit} key={number}>

        <p className={styles.benefitLabel}>{label}</p>
        <p className={styles.benefitCopy}>{description}</p>
      </div>)}
    </div>
    <div className={styles.actions}>
      <Button href="/signup" className={styles.button}>Create account</Button>
      <Button href="/login" variant="secondary" className={`${styles.button} ${styles.secondary}`}>Log in</Button>
      <p className={styles.trust}>Create an account to save your reading space.</p>
    </div>
  </AuthScreen>;
}
