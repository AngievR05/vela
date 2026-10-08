import SettingsShell from "@/components/settings/SettingsShell";
import Button from "@/components/ui/Button";
import styles from "@/components/settings/Settings.module.css";
export const metadata={title:"Signed out"};
export default function SignedOut(){return <SettingsShell title="Signed out" subtitle="Your account is safe" showNavigation={false}><div className={`${styles.outcome} `}><span className={styles.pill}>SIGNED OUT</span><h2>Your shelf will<br/>wait for you.</h2><p>You have been logged out securely.</p></div><Button href="/welcome" className={styles.primary}>Return to Welcome</Button></SettingsShell>;}
