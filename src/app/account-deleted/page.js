import SettingsShell from "@/components/settings/SettingsShell";
import Button from "@/components/ui/Button";
import styles from "@/components/settings/Settings.module.css";
export const metadata={title:"Account deleted"};
export default function AccountDeleted(){return <SettingsShell title="Account deleted" subtitle="Deletion complete" showNavigation={false}><div className={`${styles.outcome} ${styles.deleted}`}><span className={styles.pill}>ACCOUNT DELETED</span><h2>Your data has<br/>been removed.</h2><p>Thank you for reading with Vela.</p></div><Button href="/welcome" className={styles.primary}>Return to Welcome</Button></SettingsShell>;}
