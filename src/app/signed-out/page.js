import SettingsShell from "@/components/settings/SettingsShell";
import Button from "@/components/ui/Button";
import styles from "@/components/settings/Settings.module.css";
export const metadata={title:"Signed out"};
export default function SignedOut(){return <SettingsShell title="Signed out" subtitle="Your account is safe" showNavigation={false}><div className={styles.confirmation}><p>SIGNED OUT</p><h2 className={styles.intro}>Your shelf will<br/>wait for you.</h2><p>You have been logged out securely.</p><Button href="/welcome" className={styles.primary}>Return to Welcome</Button></div></SettingsShell>;}
