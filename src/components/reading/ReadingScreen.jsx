"use client";
import { useState } from "react";
import Link from "next/link";
import useHome from "@/components/home/useHome";
import ReadingShell from "./ReadingShell";
import ReadingFlow, { ReadingBookSummary } from "./ReadingFlow";
import styles from "./Reading.module.css";

export default function ReadingScreen({ userId, graveyard=false, initialBookId=null }) {
  const home=useHome(userId),[selected,setSelected]=useState(initialBookId),[flow,setFlow]=useState(null);
  const books=(home.snapshot?.books||[]).filter(book=>!book.isRemoved&&book.status===(graveyard?"dnf":"reading")).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const book=books.find(book=>book.id===selected)||books[0];
  const flowBook=home.snapshot?.books.find(book=>book.id===flow?.id);
  function open(mode,entry=book){setFlow({mode,id:entry.id});}
  return <ReadingShell title={graveyard?"Graveyard":"Current reading"}>
    {home.phase==="loading"&&!home.snapshot?<p role="status">Loading your reading record…</p>:home.phase==="error"?<div className={styles.card}><h2>Your reading record could not refresh.</h2><p>Your books are safe.</p><button type="button" className={styles.button} onClick={home.refresh}>Retry</button></div>:!books.length?<div className={styles.empty}><h2>{graveyard?"No books here yet":"Your next chapter starts here"}</h2><p>{graveyard?"Books you put aside will live here. Their progress stays saved, and you can return whenever you want.":"Start a book from your Library, or discover something new. Your progress will be here when you’re ready."}</p><Link href={graveyard?"/library":"/discover"} className={styles.button}>{graveyard?"Back to Library":"Find a book"}</Link></div>:graveyard?<div className={styles.list}>{books.map(entry=><article className={styles.card} key={entry.id}><ReadingBookSummary book={entry}/><p>{entry.dnfReason||"No reason saved"}</p><p className={styles.muted}>{entry.dnfUse?"Approved reasons may be used; your data permissions still apply.":"Not used for recommendations"}</p>{entry.privateDnfNote&&<p className={styles.muted}>Private note: {entry.privateDnfNote}</p>}<p className={styles.muted}>Started {entry.startedAt||"date not set"} · Stopped {entry.stoppedAt||"date not set"}</p><button type="button" className={styles.button} onClick={()=>open("restore",entry)}>Restore to Reading</button><Link href={`/library/${entry.id}`} className={styles.textButton}>View book</Link></article>)}</div>:<>
      {books.length>1&&<label className={styles.field}>Reading now<select className={styles.select} value={book.id} onChange={e=>setSelected(e.target.value)}>{books.map(entry=><option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>}
      <article className={`${styles.card} ${styles.green}`}><ReadingBookSummary book={book}/><p>{book.pageCount?`${book.currentPage==null?"About ":""}${book.currentPage??Math.round(book.pageCount*book.progressPercent/100)} of ${book.pageCount} pages`:`${book.progressPercent}% complete`}</p><div className={styles.bar} role="progressbar" aria-valuenow={book.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${book.title} progress`}><span style={{width:`${book.progressPercent}%`}}/></div><small>Updated {new Date(book.updatedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</small></article>
      <h2 className={styles.sectionHeading}>{book.progressPercent===100?"Reached the last page?":"Read at your own pace"}</h2><p>{book.progressPercent===100?"Your progress is saved. Mark the book finished when you are ready.":"Update your progress whenever you want. A little, a lot, or not today — it all belongs here."}</p>
      <div className={styles.overviewActions}><button type="button" className={styles.button} onClick={()=>open(book.progressPercent===100?"finish":"progress")}>{book.progressPercent===100?"Mark as finished":"Update progress"}</button><div className={styles.row}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={()=>open(book.progressPercent===100?"progress":"finish")}>{book.progressPercent===100?"Update progress":"Mark as finished"}</button><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={()=>open("dnf")}>Put book aside</button></div><button type="button" className={styles.textButton} onClick={()=>open("dates")}>Reading dates · {book.startedAt?`Started ${book.startedAt}`:"Add start date"}</button></div>
    </>}
    {home.phase==="offline"&&<p role="status" className={styles.muted}>You’re offline. Progress stays on this device until it syncs. Finish and DNF entries can be saved after reconnecting.</p>}
    {home.syncError&&<div role="alert" className={styles.error}>{home.syncError}<button type="button" className={styles.textButton} onClick={home.refresh}>Retry sync</button></div>}
    {flow&&flowBook&&<ReadingFlow key={flow.id+flow.mode} book={flowBook} mode={flow.mode} home={home} onClose={()=>setFlow(null)}/>}
  </ReadingShell>;
}
