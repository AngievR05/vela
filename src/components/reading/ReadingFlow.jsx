"use client";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import BookCover from "@/components/books/BookCover";
import BottomSheet from "@/components/feedback/BottomSheet";
import { authBody, authDisplay } from "@/components/auth/fonts";
import { createEntryId } from "@/lib/browser-id";
import { localDate } from "@/lib/reading-calendar";
import { checkReadingDates, dnfChoices, finishChoices, progressValue } from "@/lib/reading-flow";
import styles from "./Reading.module.css";

export function ReadingBookSummary({ book, green=false, compact=false }) {
  return <div className={`${styles.summary} ${green?styles.green:""} ${compact?styles.compact:""}`}>{!compact&&<Link href={`/library/${book.id}`} aria-label={`Open ${book.title}`}><BookCover title={book.title} author={book.author} src={book.coverSrc} size="current" className={styles.cover} decorative/></Link>}<div><h2><Link href={`/library/${book.id}`}>{book.title}</Link></h2><p>{book.author||"Author unavailable"}</p>{!compact&&<p>{book.progressPercent}% complete</p>}</div></div>;
}
export function ReadingDates({ start, end, setStart, setEnd, endLabel="End date", disabled=false }) {
  return <fieldset className={styles.dates} disabled={disabled}><legend>Reading dates</legend><label>Start date<input type="date" max={localDate()} value={start} onChange={e=>setStart(e.target.value)}/></label>{setEnd&&<label>{endLabel}<input type="date" min={start||undefined} max={localDate()} value={end} onChange={e=>setEnd(e.target.value)}/></label>}<small className={styles.muted}>Dates are for your reading record. They do not change your taste.</small></fieldset>;
}
function FlowAction({label,onClick,secondary,disabled}){return <button type="button" className={`${styles.button} ${secondary?styles.secondary:""}`} onClick={onClick} disabled={disabled}>{label}</button>;}

export default function ReadingFlow({ book, mode: initialMode, home, onClose, onSaved }) {
  const [mode,setMode]=useState(initialMode),[learn,setLearn]=useState(Boolean(home.snapshot?.personalisationEnabled&&(initialMode==="dnf"?book.dnfUse:book.ratingUse!==false&&book.historyUse!==false))),[pending,setPending]=useState(false),[error,setError]=useState(""),[conflict,setConflict]=useState(false);
  const [unit,setUnit]=useState(book.pageCount&&book.currentPage!=null?"page":"percent"),[value,setValue]=useState(String(book.pageCount&&book.currentPage!=null?book.currentPage:book.progressPercent));
  const [note,setNote]=useState(""),[rating,setRating]=useState(book.rating),[feedback,setFeedback]=useState(book.finishFeedback||[]),[notes,setNotes]=useState(book.notes||"");
  const [reasons,setReasons]=useState(book.dnfReasons||[]),[privateReason,setPrivateReason]=useState(book.privateDnfNote||"");
  const [start,setStart]=useState(book.startedAt||""),[end,setEnd]=useState((initialMode==="dates"?(book.status==="dnf"?book.stoppedAt:book.finishedAt):initialMode==="dnf"?book.stoppedAt:book.finishedAt)||localDate());
  const [saved,setSaved]=useState(null),[current,setCurrent]=useState(book),[undone,setUndone]=useState(false);
  const busy=useRef(false), request=useRef(null), undoRequest=useRef(null), notice=useRef(null);
  const close=useCallback(()=>{if(!busy.current)onClose();},[onClose]);
  useEffect(()=>{if(saved)notice.current?.focus();},[saved]);
  function edit(setter,next){if(busy.current)return;setter(next);setError("");request.current=null;}
  function toggle(setter,list,choice){edit(setter,list.includes(choice)?list.filter(x=>x!==choice):[...list,choice]);}
  function dateError(){return checkReadingDates(start,mode==="dates"&&book.status==="reading"?null:end);}
  async function submit(payload){
    if(busy.current)return;
    const fields={...payload},previous={...request.current};
    for(const key of ["id","operationId","expectedUpdatedAt"]){delete fields[key];delete previous[key];}
    if(!request.current||JSON.stringify(fields)!==JSON.stringify(previous))request.current={...fields,id:current.id,operationId:createEntryId(),expectedUpdatedAt:current.updatedAt};
    if(payload.kind!=="progress"&&!navigator.onLine){setError("You’re offline. Your entries are still here. Reconnect and try again; your book’s status has not changed.");return;}
    busy.current=true;setPending(true);setError("");setConflict(false);
    const submitted=request.current;
    try{
      const result=await home.mutate(submitted);
      setSaved({...result,mutation:submitted});
      if(result.book){setCurrent(result.book);onSaved?.(result.book);}
    }catch(failure){setConflict(failure.status===409);setError(failure.message||"Your update wasn’t saved. Your entries are still here; try again.");}
    finally{busy.current=false;setPending(false);}
  }
  const resume=useEffectEvent(()=>submit({kind:"restore_reading"}));
  useEffect(()=>{if(initialMode!=="restore")return;const timer=setTimeout(()=>resume(),0);return()=>clearTimeout(timer);},[initialMode]);
  async function refreshBase(){
    if(busy.current)return;busy.current=true;setPending(true);
    try{
      const response=await fetch(`/api/library/${current.id}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});
      const body=await response.json();
      if(!response.ok||!body.book||body.book.id!==current.id)throw new Error(body.error||"This book could not refresh. Your entries are still here.");
      setCurrent(body.book);onSaved?.(body.book);request.current=null;setConflict(false);setError("Book refreshed. Your entries are still here. Review them before saving.");
    }catch(failure){setError(failure.message);}finally{busy.current=false;setPending(false);}
  }
  function saveProgress(){if(note&&[book.notes,note].filter(Boolean).join("\n").length>2000){setError("Your private notes are full. Edit them in Book Detail before adding another.");return;}try{const progress=progressValue(value,unit,book.pageCount);if(unit==="percent"&&progress.percent===book.progressPercent&&book.currentPage!=null)progress.page=book.currentPage;submit({kind:"progress",...progress,note});}catch(failure){setError(failure.message);}}
  function finish(learn){const issue=dateError();if(issue){setError(issue);return;}submit({kind:"finish",startedAt:start||null,finishedAt:end,rating,notes,feedback,useForLearning:learn});}
  function dnf(learn){const issue=dateError();if(issue){setError(issue);return;}submit({kind:"dnf",startedAt:start||null,stoppedAt:end,reasons,privateReason,useForLearning:learn});}
  async function undo(){
    if(busy.current)return;busy.current=true;setPending(true);setError("");
    try{
      if(saved.queued&&home.queue.some(item=>item.operationId===saved.mutation.operationId)){home.undoQueued(saved.mutation,saved);setCurrent(saved.before);onSaved?.(saved.before);}
      else{let latest=current;if(saved.queued){const response=await fetch(`/api/library/${current.id}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error("Reconnect and refresh this book before Undo.");const body=await response.json();latest=body.book;if(!latest||latest.id!==current.id)throw new Error("Your update could not be confirmed. Refresh before Undo.");}undoRequest.current=undoRequest.current||{kind:"undo_reading",id:current.id,operationId:createEntryId(),expectedUpdatedAt:latest.updatedAt,updateId:saved.operationId||saved.mutation.operationId};const result=await home.mutate(undoRequest.current);setCurrent(result.book);onSaved?.(result.book);}
      setUndone(true);
    }catch(failure){setError(failure.message);}finally{busy.current=false;setPending(false);}
  }
  let invalid="";try{progressValue(value,unit,book.pageCount);}catch(failure){invalid=failure.message;}
  const fonts=`${authBody.variable} ${authDisplay.variable}`;
  if(saved){
    const message=undone?"Update undone":saved.noChange?"Already up to date":saved.queued?"Progress saved · syncs when online":mode==="finish"?"Book finished":mode==="dnf"?"Book set aside":mode==="restore"?"Back in Currently Reading":mode==="dates"?"Reading dates saved":"Progress saved";
    return <aside ref={notice} tabIndex={-1} className={`${fonts} ${styles.savedNotice}`} aria-label="Reading update"><div role="status"><strong>{message}</strong><span>{current.title}</span></div><div className={styles.noticeActions}>{!undone&&!saved.noChange&&<button type="button" onClick={undo} disabled={pending}>{pending?"Undoing…":"Undo"}</button>}<button type="button" onClick={close} disabled={pending} aria-label="Dismiss reading update">×</button></div>{error&&<p role="alert" className={styles.error}>{error}</p>}{!undone&&current.status==="reading"&&current.progressPercent===100&&<button type="button" className={styles.textButton} onClick={()=>{setSaved(null);setMode("finish");setUndone(false);setNotes(current.notes||"");setRating(current.rating);setFeedback(current.finishFeedback||[]);setStart(current.startedAt||"");setEnd(localDate());request.current=null;undoRequest.current=null;}}>Finished reading? Mark finished</button>}</aside>;
  }
  const title=mode==="finish"?"Finish book":mode==="dnf"?"Set book aside":mode==="restore"?"Resume reading":mode==="dates"?"Reading dates":"Update progress";
  function save(){if(mode==="progress")saveProgress();else if(mode==="finish")finish(learn);else if(mode==="dnf")dnf(learn);else if(mode==="restore")submit({kind:"restore_reading"});else{const issue=dateError();if(issue){setError(issue);return;}submit({kind:"reading_dates",startedAt:start||null,finishedAt:book.status==="finished"?end||null:null,stoppedAt:book.status==="dnf"?end||null:book.stoppedAt||null});}}
  return <div className={fonts}><BottomSheet open title={title} onClose={close} dismissOnBackdrop={!pending} className={styles.sheet} backdropClassName={styles.backdrop}>
    <form onSubmit={e=>{e.preventDefault();save();}} noValidate>
      <ReadingBookSummary book={book} compact/>
      <fieldset className={styles.editFields} disabled={pending}>
        {mode==="progress"&&<><div className={styles.segments} role="group" aria-label="Progress format">{["page","percent"].map(item=><button key={item} type="button" aria-pressed={unit===item} disabled={item==="page"&&!book.pageCount} onClick={()=>{edit(setUnit,item);setValue(String(item==="page"?book.currentPage??"":book.progressPercent));}}>{item==="page"?"Pages":"Percent"}</button>)}</div><label className={styles.field}>{unit==="page"?"Current page":"Percent complete"}<input aria-label={unit==="page"?"Current page":"Percent complete"} autoComplete="off" inputMode="numeric" type="number" min="0" max={unit==="page"?book.pageCount:100} step="1" value={value} onChange={e=>edit(setValue,e.target.value)} aria-invalid={Boolean(invalid)} aria-describedby="reading-progress-help"/><small id="reading-progress-help">{invalid||(unit==="page"?`of ${book.pageCount} pages`:"of 100%")}</small></label><details className={styles.optional}><summary>Add a private note</summary><label className={styles.field}>Reading note (optional)<textarea aria-label="Reading note (optional)" placeholder="A thought to remember" maxLength={300} value={note} onChange={e=>edit(setNote,e.target.value)}/><small>Private to you. Never used for recommendations.</small></label></details></>}
        {mode==="finish"&&<><p className={styles.muted}>Your rating · optional</p><div className={styles.stars} role="group" aria-label="Book rating">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={`${n} ${n===1?"star":"stars"}`} aria-pressed={rating>=n} onClick={()=>edit(setRating,rating===n?null:n)}>{rating>=n?"★":"☆"}</button>)}</div><p className={styles.muted}>{rating?`${rating} out of 5 · Tap again to clear`:"You can rate it later"}</p></>}
        {mode==="dnf"&&<><p className={styles.muted}>No need to finish every book. Your progress stays saved.</p><div className={styles.chips} role="group" aria-label="Optional reasons">{dnfChoices.map(choice=><button key={choice} type="button" aria-pressed={reasons.includes(choice)} onClick={()=>toggle(setReasons,reasons,choice)}>{choice}</button>)}</div></>}
        {(mode==="finish"||mode==="dnf")&&<><details className={styles.optional}><summary>More details · dates, notes{mode==="finish"?" & feedback":""}</summary><ReadingDates start={start} end={end} setStart={v=>edit(setStart,v)} setEnd={v=>edit(setEnd,v)} endLabel={mode==="dnf"?"Stopped reading":"Finished reading"}/>{mode==="finish"&&<><p className={styles.muted}>What worked for you? · optional</p><div className={styles.chips}>{finishChoices.map(choice=><button type="button" key={choice} aria-pressed={feedback.includes(choice)} onClick={()=>toggle(setFeedback,feedback,choice)}>{choice}</button>)}</div></>}<label className={styles.field}>{mode==="finish"?"Your private note":"Other reason · private note"}<textarea aria-label={mode==="finish"?"Your private note":"Other reason"} value={mode==="finish"?notes:privateReason} onChange={e=>edit(mode==="finish"?setNotes:setPrivateReason,e.target.value)} maxLength={mode==="finish"?2000:300}/><small>Private to you. Never used for recommendations.</small></label></details><p className={styles.muted}>{mode==="finish"?"Finished":"Stopped"} {end===localDate()?"today":end} · Change under More details</p><label className={styles.learning}><input type="checkbox" checked={learn} onChange={e=>edit(setLearn,e.target.checked)}/><span>Use my {mode==="finish"?"rating and feedback":"selected reasons"} for recommendations<small>{home.snapshot?.personalisationEnabled?"Your Settings permissions still apply.":"Personalisation is off in Settings."}{mode==="dnf"&&" “Not in the mood” is never a lasting preference."}</small></span></label></>}
        {mode==="dates"&&<ReadingDates start={start} end={end} setStart={v=>edit(setStart,v)} setEnd={book.status==="finished"||book.status==="dnf"?v=>edit(setEnd,v):undefined} endLabel={book.status==="dnf"?"Stopped reading":"Finished reading"}/>}
        {mode==="restore"&&<p>Continue at {book.progressPercent}%. Your saved notes and reasons stay available.</p>}
      </fieldset>
      {error&&<p className={styles.error} role="alert">{error}</p>}{conflict&&<FlowAction label="Refresh book and keep entries" onClick={refreshBase} secondary disabled={pending}/>}
      <div className={styles.sheetActions}><button type="submit" className={styles.button} disabled={pending||(mode==="progress"&&Boolean(invalid))}>{pending?"Saving…":mode==="finish"?"Mark finished":mode==="dnf"?"Set aside (DNF)":mode==="restore"?"Resume reading":mode==="dates"?"Save dates":"Save progress"}</button><FlowAction label="Cancel" onClick={close} secondary disabled={pending}/></div>
    </form>
  </BottomSheet></div>;
}
