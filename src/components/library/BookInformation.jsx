"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { bookCluesSchema, bookFit, bookGenres, verifiedBookClues } from "@/lib/book-insights";
import { plainDescription } from "@/lib/library-data";
import Button from "@/components/ui/Button";
import InlineAlert from "@/components/ui/InlineAlert";
import styles from "./Library.module.css";

export default function BookInformation({book,snapshot,offline}) {
  const [clues,setClues]=useState({pace:null,moods:[],tropes:[]});
  const [phase,setPhase]=useState("idle");
  const busy=useRef(false);
  const bookId=book.id;
  const metadataDescription=book.description;
  const genres=bookGenres(book);
  const fit=bookFit(book,snapshot,clues);
  const description=plainDescription(book.description);
  const analyse=useCallback(async signal=>{
    if(busy.current)return;busy.current=true;setPhase("loading");
    try{
      const response=await fetch(`/api/library/${bookId}/insights`,{method:"POST",cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(35000)]):AbortSignal.timeout(35000)});
      if(response.status===401){window.location.replace(`/login?next=${encodeURIComponent(`/library/${bookId}`)}`);return;}
      const body=await response.json();
      if(!response.ok||!bookCluesSchema.safeParse(body.clues).success)throw new Error("Clues unavailable");
      if(signal?.aborted)return;
      setClues(verifiedBookClues(body.clues,{description:metadataDescription}));setPhase("ready");
    }catch{if(!signal?.aborted)setPhase("error");}finally{busy.current=false;}
  },[bookId,metadataDescription]);
  useEffect(()=>{
    if(offline||book.googleBooksId.startsWith("manual:")||!metadataDescription)return;
    const controller=new AbortController();
    const timer=setTimeout(()=>analyse(controller.signal),0);
    return()=>{clearTimeout(timer);controller.abort();};
  },[analyse,offline,book.googleBooksId,metadataDescription]);
  return <>
    <section className={`${styles.information} ${styles.fit}`} aria-label="Your reading fit"><h2>{fit.label}</h2><p>{fit.text}</p><Button href="/dna" variant="tertiary">Review Reading DNA →</Button></section>
    <section className={styles.information} aria-label="About this book"><h2>About this book</h2>
      {description.length>650?<details className={styles.descriptionDisclosure}><summary>Read the full description</summary><p className={styles.description}>{description}</p></details>:<p className={styles.description}>{description||"No description is available for this edition."}</p>}
      {description.length>650&&<p className={styles.description}>{description.slice(0,650)}…</p>}
      <h3>Genres</h3>{genres.length?<ul className={styles.tags}>{genres.map(genre=><li key={genre}>{genre}</li>)}</ul>:<p>Genre information unavailable.</p>}
      <dl className={styles.attributes}><div><dt>Length</dt><dd>{book.pageCount?`${book.pageCount} pages · ${book.pageCount<300?"Short":book.pageCount<500?"Medium":"Long"}`:"Page count unavailable"}</dd></div><div><dt>Pace</dt><dd>{clues.pace?.label||"Not established"}</dd></div><div><dt>Moods</dt><dd>{clues.moods.map(item=>item.label).join(" · ")||"Not established"}</dd></div><div><dt>Edition</dt><dd>{book.publishedDate||"Publication date unavailable"}</dd></div></dl>
      <h3>Story elements & tropes</h3>{clues.tropes.length?<ul className={styles.tags}>{clues.tropes.map(item=><li key={item.label}>{item.label}</li>)}</ul>:<p>No supported trope clues yet.</p>}
      <small>{book.googleBooksId.startsWith("manual:")?"Your private manual entry":"Description, genres and page count: Google Books. Length labels: under 300, 300–499, or 500+ pages."}</small>
      {!book.googleBooksId.startsWith("manual:")&&description&&phase!=="ready"&&<Button variant="secondary" onClick={()=>analyse()} disabled={offline} loading={phase==="loading"}>{phase==="error"?"Retry book clues":"Find mood, pace and trope clues"}</Button>}
      {phase==="error"&&<InlineAlert type="error">Book clues couldn’t load. Please try again; your book and progress are safe.</InlineAlert>}
      {phase==="ready"&&<small>Clues are AI interpretations of the description. Anything unsupported stays unknown.</small>}
      {[clues.pace,...clues.moods,...clues.tropes].filter(Boolean).length>0&&<details className={styles.descriptionDisclosure}><summary>Why these clues?</summary>{[clues.pace,...clues.moods,...clues.tropes].filter(Boolean).map(item=><p key={item.label}><strong>{item.label}</strong> — “{item.evidence}”</p>)}</details>}
    </section>
  </>;
}
