"use client";
import { useCallback, useRef, useState } from "react";
import LibraryShell from "./LibraryShell";
import BookInformation from "./BookInformation";
import useHome from "@/components/home/useHome";
import { readingDays } from "@/lib/library-data";
import { libraryBookSchema } from "@/lib/home-data";
import BookCover from "@/components/books/BookCover";
import ReadingProgressControl from "@/components/books/ReadingProgressControl";
import Rating from "@/components/ui/Rating";
import Checkbox from "@/components/ui/Checkbox";
import TextArea from "@/components/ui/TextArea";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InlineAlert from "@/components/ui/InlineAlert";
import LinearProgress from "@/components/ui/LinearProgress";
import BottomSheet from "@/components/feedback/BottomSheet";
import ConfirmationDialog from "@/components/feedback/ConfirmationDialog";
import styles from "./Library.module.css";
const labels={want_to_read:"TBR",reading:"Reading",finished:"Finished",dnf:"DNF"};
export default function BookDetail({ userId, initialBook, onBack }) {
  const home=useHome(userId);
  const [override,setOverride]=useState(initialBook);
  const [modal,setModal]=useState(null);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [mode,setMode]=useState("percent");
  const [progress,setProgress]=useState("");
  const [rating,setRating]=useState(null);
  const [notes,setNotes]=useState("");
  const [favourite,setFavourite]=useState(false);
  const [reason,setReason]=useState("");
  const [dnfUse,setDnfUse]=useState(false);
  const [revision,setRevision]=useState(false);
  const busy=useRef(false);
  const close=useCallback(()=>{if(!busy.current)setModal(null);},[]);
  const cached=home.snapshot?.books.find(item=>item.id===initialBook.id);
  const book=cached&&Date.parse(cached.updatedAt)>=Date.parse(override.updatedAt)?cached:override;
  const offline=!home.online||home.phase==="offline";
  async function change(mutation){
    if(busy.current)return false;
    busy.current=true;setPending(true);setError("");setNotice("");
    try{
      const result=await home.mutate({...mutation,id:book.id});
      if(result.book)setOverride(result.book);
      setNotice(result.queued?"Saved on this device. Your changes will sync when online.":mutation.kind==="remove"?"Book removed from your Library. Undo is available here.":"Changes saved.");setModal(null);return true;
    }catch(failure){setError(failure.message);return false;}
    finally{busy.current=false;setPending(false);}
  }
  function openProgress(){setMode("percent");setProgress(String(book.progressPercent));setError("");setModal("progress");}
  function openReview(){setRating(book.rating);setNotes(book.notes);setFavourite(book.favourite);setError("");setModal("review");}
  function openDnf(){setReason(book.dnfReason||"");setDnfUse(book.dnfUse);setError("");setModal("dnf");}
  async function saveProgress(event){
    event.preventDefault();const amount=Number(progress);
    const limit=mode==="page"?book.pageCount:100;
    if(!progress.trim()||!Number.isInteger(amount)||amount<0||amount>limit){setError(`Enter a whole number from 0 to ${limit}. Your input is still here.`);return;}
    const percent=mode==="page"?amount===book.pageCount?100:Math.min(99,Math.round(amount*100/book.pageCount)):amount;
    await change({kind:"progress",percent,...(mode==="page"?{page:amount}:{})});
  }
  async function refreshBook(){
    if(busy.current)return;busy.current=true;setRevision(true);setError("");
    try{const response=await fetch(`/api/library/${book.id}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});if(response.status===401){window.location.replace("/login");return;}
      const body=await response.json();if(!response.ok)throw new Error(body.error);const parsed=libraryBookSchema.safeParse(body.book);if(!parsed.success)throw new Error("Book data unavailable");setOverride(parsed.data);await home.refreshQuietly();
    }catch{setError("We couldn’t refresh this book. Please try again.");}finally{busy.current=false;setRevision(false);}
  }
  async function share(){
    const info={title:book.title,text:`${book.title}${book.author?` by ${book.author}`:""}`,...(!book.googleBooksId.startsWith("manual:")?{url:`https://books.google.com/books?id=${encodeURIComponent(book.googleBooksId)}`}:{})};
    try{if(navigator.share)await navigator.share(info);else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText([info.text,info.url].filter(Boolean).join("\n"));setNotice("Book information copied.");}else{setModal("share");return;}setModal(null);}catch(failure){if(failure.name!=="AbortError"){setError("");setModal("share");}}
  }
  const days=readingDays(book);
  const percentText=book.pageCount?`${book.currentPage==null?"About ":""}${book.currentPage??Math.round(book.pageCount*book.progressPercent/100)} of ${book.pageCount} pages`:`${book.progressPercent}% complete`;
  return <LibraryShell title="Book detail" subtitle={book.isRemoved?"REMOVED":offline?"OFFLINE":labels[book.status].toUpperCase()} kind="detail" back="/library" onBack={onBack}>
    {offline&&<InlineAlert type="info">You’re offline. Saved book facts are available; progress will sync when online.</InlineAlert>}
    <div className={styles.detailHero}><a href={!book.googleBooksId.startsWith("manual:")?`https://books.google.com/books?id=${encodeURIComponent(book.googleBooksId)}`:undefined} target="_blank" rel="noreferrer" aria-label={`View ${book.title} on Google Books`}>
      <BookCover title={book.title} author={book.author} src={book.coverSrc} size="detail" className={styles.detailCover} placeholderType="book" decorative />
    </a><div><span className={styles.status}>{book.status==="want_to_read"?"To be read":labels[book.status].toUpperCase()}</span><h2>{book.title}</h2><p className={styles.author}>{book.author||"Author unavailable"}</p>
      <p className={styles.bookFacts}>{[book.categories[0],book.publishedDate?.slice(0,4)].filter(Boolean).join(" · ")}</p>{book.pageCount&&<p>{book.pageCount} pages</p>}{book.isbn&&<p className={styles.bookFacts}>ISBN {book.isbn}</p>}
      <small>{book.googleBooksId.startsWith("manual:")?"Your private manual entry":"Book facts · Google Books"}</small>
    </div></div>
    {book.isRemoved?<Card className={styles.empty}><h2>This book is no longer in your Library.</h2><p>Your saved progress and notes are retained for Undo.</p><Button onClick={()=>change({kind:"restore"})} loading={pending} disabled={offline}>Undo removal</Button><Button href="/library" variant="secondary">Back to Library</Button></Card>:<>
      {book.status==="want_to_read"&&<Button className={styles.fullButton} onClick={()=>change({kind:"start"})} loading={pending}>Start reading</Button>}
      {book.status==="reading"&&<><Card className={styles.progressCard}><div><p>{percentText}</p><strong>{book.progressPercent}%</strong></div><LinearProgress value={book.progressPercent} label={`${book.title} reading progress`} /><small>Last updated {new Date(book.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</small></Card><Button className={styles.fullButton} onClick={openProgress} disabled={pending}>Update progress</Button></>}
      {book.status==="finished"&&<><div className={styles.finishedStats}><div><strong>{book.rating?"★".repeat(book.rating):"—"}</strong><p>{book.rating?`${book.rating} stars`:"Not rated"}</p></div><div><strong>{days?`${days} ${days===1?"day":"days"}`:"—"}</strong><p>Reading time</p></div><div><strong>{book.favourite?"Favourite":"Finished"}</strong><p>{book.favourite?"Saved":"In your Library"}</p></div></div>{book.notes&&<blockquote className={styles.note}>{book.notes}</blockquote>}<Button className={`${styles.fullButton} ${styles.secondary}`} variant="secondary" onClick={openReview} disabled={offline}>Edit rating and notes</Button></>}
      {book.status==="dnf"&&<><Card className={styles.dnfCard}><p>WHY IT WASN’T RIGHT</p><h2>{book.dnfReason||"No reason saved"}</h2><p>{book.dnfUse?"You allowed this reason for learning. Your data settings still apply.":"Not used for recommendations"}</p></Card><Button className={styles.fullButton} onClick={()=>change({kind:"status",status:"want_to_read"})} loading={pending} disabled={offline}>Restore to TBR</Button><Button variant="tertiary" onClick={openDnf} disabled={offline}>Edit DNF reason</Button></>}
    </>}
    {!book.isRemoved&&<Button className={`${styles.fullButton} ${styles.secondary}`} variant="secondary" onClick={()=>{setError("");setModal("actions");}} disabled={pending}>More actions</Button>}
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
    {error&&!modal&&<InlineAlert type="error">{error}</InlineAlert>}
    {!book.isRemoved&&<BookInformation key={book.id} book={book} snapshot={home.snapshot} offline={offline}/>}
    {book.status==="finished"&&!book.isRemoved&&<Button className={`${styles.fullButton} ${styles.secondary}`} variant="secondary" href={`/stats?view=books&book=${book.id}`}>Edit finish date and reading record</Button>}
    {!offline&&<Button variant="tertiary" onClick={refreshBook} loading={revision}>Refresh book</Button>}
    <BottomSheet className={styles.sheet} backdropClassName={styles.backdrop} open={modal==="share"} title="Share book" onClose={close}>
      <div className={styles.form}><p>Select and copy this book information to share it.</p><textarea aria-label="Book information to share" readOnly rows={4} value={`${book.title}${book.author?` by ${book.author}`:""}${!book.googleBooksId.startsWith("manual:")?`\nhttps://books.google.com/books?id=${encodeURIComponent(book.googleBooksId)}`:""}`} onFocus={event=>event.currentTarget.select()}/><Button variant="secondary" onClick={close}>Done</Button></div>
    </BottomSheet>
    <BottomSheet className={styles.sheet} backdropClassName={styles.backdrop} open={modal==="actions"} title="Book actions" onClose={close}>
      <div className={styles.form}><Button variant="secondary" onClick={share}>Share book</Button><Button variant="secondary" onClick={openReview} disabled={offline}>Edit rating, notes and favourite</Button>
        {book.status!=="want_to_read"&&<Button variant="secondary" onClick={()=>change({kind:"status",status:"want_to_read"})} disabled={offline} loading={pending}>Move to TBR</Button>}
        {book.status!=="reading"&&<Button variant="secondary" onClick={()=>change({kind:"status",status:"reading"})} disabled={offline} loading={pending}>Start reading</Button>}
        {book.status!=="finished"&&<Button variant="secondary" onClick={()=>change({kind:"status",status:"finished"})} disabled={offline} loading={pending}>Mark as Finished</Button>}
        <Button variant="secondary" onClick={openDnf} disabled={offline}>Move to DNF</Button><Button variant="destructive" onClick={()=>{setError("");setModal("remove");}} disabled={offline}>Remove from Library</Button>
        {error&&<InlineAlert type="error">{error}</InlineAlert>}
      </div>
    </BottomSheet>
    <BottomSheet className={styles.sheet} backdropClassName={styles.backdrop} open={modal==="progress"} title="Update progress" onClose={close}><form className={styles.form} onSubmit={saveProgress} noValidate>
      <ReadingProgressControl mode={mode} onModeChange={next=>{setMode(next);setProgress(next==="page"?String(book.currentPage??Math.round(book.pageCount*book.progressPercent/100)):String(book.progressPercent));setError("");}} value={progress} onValueChange={setProgress} maxPages={book.pageCount} allowPages={Boolean(book.pageCount)} disabled={pending} error={error}/>
      <p>100% marks this book finished.</p><Button type="submit" loading={pending}>{offline?"Save on this device":"Save progress"}</Button>
    </form></BottomSheet>
    <BottomSheet className={styles.sheet} backdropClassName={styles.backdrop} open={modal==="review"} title="Rating and notes" onClose={close}><form className={styles.form} onSubmit={event=>{event.preventDefault();change({kind:"review",rating,notes,favourite});}}>
      <Rating value={rating||0} onChange={setRating} disabled={pending}/><Button variant="tertiary" onClick={()=>setRating(null)} disabled={pending}>Clear rating</Button>
      <Checkbox label="Favourite" checked={favourite} onChange={event=>setFavourite(event.target.checked)} disabled={pending}/>
      <TextArea id="book-notes" label="Your private notes" value={notes} onChange={event=>setNotes(event.target.value)} maxLength={2000} rows={5} disabled={pending}/>
      {error&&<InlineAlert type="error">{error}</InlineAlert>}<Button type="submit" loading={pending} disabled={offline}>Save rating and notes</Button>
    </form></BottomSheet>
    <BottomSheet className={styles.sheet} backdropClassName={styles.backdrop} open={modal==="dnf"} title="Why did you stop?" onClose={close}><form className={styles.form} onSubmit={event=>{event.preventDefault();if(!reason.trim()){setError("Add a short reason. Your input is still here.");return;}change({kind:"status",status:"dnf",reason,useForLearning:dnfUse});}}>
      <TextArea id="dnf-reason" label="DNF reason" value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} rows={4} disabled={pending}/>
      <Checkbox label="Allow Vela to use this reason for learning" supportingText="Your separate data permissions still apply." checked={dnfUse} onChange={event=>setDnfUse(event.target.checked)} disabled={pending}/>
      {error&&<InlineAlert type="error">{error}</InlineAlert>}<Button type="submit" loading={pending} disabled={offline}>Save DNF</Button>
    </form></BottomSheet>
    <ConfirmationDialog open={modal==="remove"} title="Remove this book?" description={error||"This book will leave your Library. Your progress and private notes are retained so you can Undo."} confirmLabel="Remove book" destructive loading={pending} onCancel={close} onConfirm={()=>change({kind:"remove"})}/>
  </LibraryShell>;
}
