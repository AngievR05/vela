import AuthScreen, { AuthNavigation } from "./AuthScreen";
import Button from "@/components/ui/Button";
import Image from "next/image";
import styles from "./Auth.module.css";

export default function LegalNotice({ kind, onBack }) {
  const privacy = kind === "privacy";
  return <AuthScreen>
    {onBack ? <nav className={styles.navigation} aria-label="Account navigation"><button type="button" className={styles.back} onClick={onBack} aria-label="Back to account"><Image src="/auth/final-back.svg" width={24} height={24} alt="" unoptimized /></button><p>{privacy ? "PRIVACY NOTICE" : "TERMS"}</p></nav> : <AuthNavigation label={privacy ? "PRIVACY NOTICE" : "TERMS"} href="/signup" backLabel="Back to account" />}
    <h1 className={styles.heading}>{privacy ? "Privacy Notice" : "Terms"}</h1>
    <article className={styles.legalBody}>{privacy ? <>
      <section><h2>Your account</h2><p>Your email supports login and password recovery.</p></section>
      <section><h2>Your reading space</h2><p>Books and progress support your Library. Only reading signals you allow should influence personalised suggestions.</p></section>
      <section><h2>Your control</h2><p>Reading DNA is editable. Personalisation can be turned off while Library tracking remains available. Private notes stay separate from approved learning.</p></section>
      <p>Review AI and data controls in Settings.</p>
    </> : <>
      <h2>About using Vela</h2><p>Vela helps you organise books and choose what to read next. Recommendations support your judgement and may be incomplete or inaccurate.</p>
      <p>You decide what to read and whether to use personalisation. Keep your login details private.</p>
      <p>You can put a book aside, change your preferences or stop using Vela.</p>
    </>}</article>
    <div className={styles.actions}><Button className={styles.button} onClick={onBack} href={onBack ? undefined : "/signup"}>Back to account</Button></div>
  </AuthScreen>;
}
