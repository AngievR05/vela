import SettingsShell from "@/components/settings/SettingsShell";
import Button from "@/components/ui/Button";
import styles from "@/components/settings/Settings.module.css";
export const metadata={title:"Account deleted"};
export default function AccountDeleted(){return <SettingsShell title="Account deleted" subtitle="Deletion complete" showNavigation={false}><div className={styles.confirmation}><p>ACCOUNT DELETED</p><h2 className={styles.intro}>Your data has<br/>been removed.</h2><p>Thank you for reading with Vela.</p><Button href="/welcome" className={styles.primary}>Return to Welcome</Button></div></SettingsShell>;}
