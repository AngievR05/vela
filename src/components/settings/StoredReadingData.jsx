"use client";
import useHome from "@/components/home/useHome";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InlineAlert from "@/components/ui/InlineAlert";
import styles from "./Settings.module.css";
export default function StoredReadingData({userId,onPermissions,onExport,Row}){
 const home=useHome(userId,{returnPath:"/settings?view=data"});
 const books=home.snapshot?.books.filter(book=>!book.isRemoved);
 return <><Card className={`${styles.panel} ${styles.purple} ${styles.storedPanel}`}><h2>Your reading<br/>records</h2><p>Account details, Library records, progress and private notes are stored for your account. Approved learning sources are separate. Review the Privacy Notice for retention details.</p></Card>
  {!home.online&&<InlineAlert type="info">You’re offline. Counts reflect the saved records on this device.</InlineAlert>}
  {home.phase==="error"&&<InlineAlert type="error">Your reading records could not refresh. <Button variant="tertiary" onClick={home.refresh}>Retry</Button></InlineAlert>}
  <Row title="Learning permissions" description="Activity sources are separate choices" onClick={onPermissions}/>
  <Row title="Library and progress" description={books?`${books.length} ${books.length===1?"book":"books"} · Reading, To be read, Finished, Set aside`:home.phase==="loading"?"Loading your book count…":"Book count unavailable"} href="/library"/>
  <Row title="Ratings and reflections" description="Structured feedback and private notes" href="/library?tab=finished"/>
  <Row title="Export my data" description="Request a portable account archive" danger onClick={onExport}/>
 </>;
}
