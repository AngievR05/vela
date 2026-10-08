"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BookCover from "@/components/books/BookCover";
import BottomSheet from "@/components/feedback/BottomSheet";
import { authBody, authDisplay } from "@/components/auth/fonts";
import { createEntryId } from "@/lib/browser-id";
import { localDate } from "@/lib/reading-calendar";
import { checkReadingDates, dnfChoices, finishChoices, progressValue } from "@/lib/reading-flow";
import ReadingShell from "./ReadingShell";
import styles from "./Reading.module.css";

export function ReadingBookSummary({ book, green=false, compact=false }) {
  return <div className={`${styles.summary} ${green?styles.green:""} ${compact?styles.compact:""}`}>{!compact&&<Link href={`/library/${book.id}`} aria-label={`Open ${book.title}`}><BookCover title={book.title} author={book.author} src={book.coverSrc} size="current" className={styles.cover} decorative/></Link>}<div><h2><Link href={`/library/${book.id}`}>{book.title}</Link></h2><p>{book.author||"Author unavailable"}</p>{!compact&&<p>{book.progressPercent}% complete</p>}</div></div>;
}
export function ReadingDates({ start, end, setStart, setEnd, endLabel="End date", disabled=false }) {
  return <fieldset className={styles.dates} disabled={disabled}><legend>Reading dates</legend><label>Start date<input type="date" max={localDate()} value={start} onChange={e=>setStart(e.target.value)}/></label>{setEnd&&<label>{endLabel}<input type="date" min={start||undefined} max={localDate()} value={end} onChange={e=>setEnd(e.target.value)}/></label>}<small className={styles.muted}>Dates are for your reading record. They do not change your taste.</small></fieldset>;
}
function FlowAction({label,onClick,secondary,disabled}){return <button type="button" className={`${styles.button} ${secondary?styles.secondary:""}`} onClick={onClick} disabled={disabled}>{label}</button>;}

export default function ReadingFlow({ book, mode: initialMode, home, onClose, onSaved }) {
  const [mode]=useState(initialMode),[step,setStep]=useState(0),[pending,setPending]=useState(false),[error,setError]=useState(""),[conflict,setConflict]=useState(false);
  const [unit,setUnit]=useState(book.pageCount&&book.currentPage!=null?"page":"percent"),[value,setValue]=useState(String(book.pageCount&&book.currentPage!=null?book.currentPage:book.progressPercent));
  const [note,setNote]=useState(""),[rating,setRating]=useState(book.rating),[feedback,setFeedback]=useState(book.finishFeedback||[]),[notes,setNotes]=useState(book.notes||"");
  const [reasons,setReasons]=useState(book.dnfReasons||[]),[privateReason,setPrivateReason]=useState(book.privateDnfNote||""),[other,setOther]=useState(false);
  const [start,setStart]=useState(book.startedAt||""),[end,setEnd]=useState((initialMode==="dates"?(book.status==="dnf"?book.stoppedAt:book.finishedAt):initialMode==="dnf"?book.stoppedAt:book.finishedAt)||localDate());
  const [failed,setFailed]=useState(false);
  const [saved,setSaved]=useState(null),[current,setCurrent]=useState(book),[undone,setUndone]=useState(false);
  const busy=useRef(false), request=useRef(null), undoRequest=useRef(null), dialog=useRef(null);
  const close=useCallback(()=>{if(!busy.current)onClose();},[onClose]);
  useEffect(()=>{
    if(mode==="progress"&&!saved)return;
    const previous=document.activeElement;dialog.current?.focus();
    const handle=e=>{if(e.key==="Escape"){e.preventDefault();close();}if(e.key==="Tab"){
      const items=Array.from(dialog.current?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled])')||[]);const first=items[0],last=items.at(-1);
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }};
    document.addEventListener("keydown",handle);return()=>{document.removeEventListener("keydown",handle);previous?.focus?.();};
  },[mode,saved,close]);
  function edit(setter,next){if(busy.current)return;setter(next);setError("");request.current=null;}
  function toggle(setter,list,choice){edit(setter,list.includes(choice)?list.filter(x=>x!==choice):[...list,choice]);}
  function dateError(){return checkReadingDates(start,mode==="dates"&&book.status==="reading"?null:end);}
  async function submit(payload){
    if(busy.current)return;
    const fields={...payload},previous={...request.current};
    for(const key of ["id","operationId","expectedUpdatedAt"]){delete fields[key];delete previous[key];}
    if(!request.current||JSON.stringify(fields)!==JSON.stringify(previous))request.current={...fields,id:current.id,operationId:createEntryId(),expectedUpdatedAt:current.updatedAt};
    if(payload.kind!=="progress"&&!navigator.onLine){setError("You’re offline. Your entries are still here. Reconnect and try again; your book’s status has not changed.");setFailed(true);return;}
    busy.current=true;setPending(true);setError("");setConflict(false);
    const submitted=request.current;
    try{
      const result=await home.mutate(submitted);
      setSaved({...result,mutation:submitted});setFailed(false);
      if(result.book){setCurrent(result.book);onSaved?.(result.book);}
    }catch(failure){setConflict(failure.status===409);setError(failure.message||"Your update wasn’t saved. Your entries are still here; try again.");if(mode!=="progress")setFailed(true);}
    finally{busy.current=false;setPending(false);}
  }
  async function refreshBase(){
    if(busy.current)return;busy.current=true;setPending(true);
    try{
      const response=await fetch(`/api/library/${current.id}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});
      const body=await response.json();
      if(!response.ok||!body.book||body.book.id!==current.id)throw new Error(body.error||"This book could not refresh. Your entries are still here.");
      setCurrent(body.book);onSaved?.(body.book);request.current=null;setConflict(false);setFailed(false);setError("Book refreshed. Your entries are still here. Review them before saving.");
    }catch(failure){setError(failure.message);}finally{busy.current=false;setPending(false);}
  }
  function saveProgress(){if(note&&[book.notes,note].filter(Boolean).join("\n").length>2000){setError("Your private notes are full. Edit them in Book Detail before adding another.");return;}try{const progress=progressValue(value,unit,book.pageCount);if(unit==="percent"&&progress.percent===book.progressPercent&&book.currentPage!=null)progress.page=book.currentPage;submit({kind:"progress",...progress,note});}catch(failure){setError(failure.message);}}
  function finish(learn,skip=false){const issue=dateError();if(issue){setError(issue);setStep(0);return;}submit({kind:"finish",startedAt:start||null,finishedAt:end,rating:skip?book.rating:rating,notes:skip?book.notes:notes,feedback:skip?[]:feedback,useForLearning:learn});}
  function dnf(learn){const issue=dateError();if(issue){setError(issue);setStep(0);return;}submit({kind:"dnf",startedAt:start||null,stoppedAt:end,reasons,privateReason,useForLearning:learn});}
  async function undo(){
    if(busy.current)return;busy.current=true;setPending(true);setError("");
    try{
      if(saved.queued&&home.queue.some(item=>item.operationId===saved.mutation.operationId)){home.undoQueued(saved.mutation,saved);setCurrent(saved.before);onSaved?.(saved.before);}
      else{let latest=current;if(saved.queued){const response=await fetch(`/api/library/${current.id}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error("Reconnect and refresh this book before Undo.");const body=await response.json();latest=body.book;if(!latest||latest.id!==current.id)throw new Error("Your update could not be confirmed. Refresh before Undo.");}undoRequest.current=undoRequest.current||{kind:"undo_reading",id:current.id,operationId:createEntryId(),expectedUpdatedAt:latest.updatedAt,updateId:saved.operationId||saved.mutation.operationId};const result=await home.mutate(undoRequest.current);setCurrent(result.book);onSaved?.(result.book);}
      setUndone(true);
    }catch(failure){setError(failure.message);}finally{busy.current=false;setPending(false);}
  }
  let invalid="";try{progressValue(value,unit,book.pageCount);}catch(failure){invalid=failure.message;}
  if(mode==="progress"&&!saved)return <div className={`${authBody.variable} ${authDisplay.variable}`}><BottomSheet open title="Update progress" onClose={close} dismissOnBackdrop={!pending} showCloseButton={false} className={styles.sheet} backdropClassName={styles.backdrop}>
    <form onSubmit={e=>{e.preventDefault();saveProgress();}} noValidate>
      <p className={styles.muted}>{book.title}</p><div className={styles.segments} role="group" aria-label="Progress format">{["page","percent"].map(item=><button key={item} type="button" aria-pressed={unit===item} disabled={pending||(item==="page"&&!book.pageCount)} onClick={()=>{edit(setUnit,item);setValue(String(item==="page"?book.currentPage??"":book.progressPercent));}}>{item==="page"?"Pages":"Percent"}</button>)}</div>
      <label className={styles.field}>{unit==="page"?"Current page":"Percent complete"}<input aria-label={unit==="page"?"Current page":"Percent complete"} autoComplete="off" inputMode="numeric" type="number" min="0" max={unit==="page"?book.pageCount:100} step="1" value={value} onChange={e=>edit(setValue,e.target.value)} disabled={pending} aria-invalid={Boolean(invalid)} aria-describedby="reading-progress-help"/><small id="reading-progress-help">{invalid||(unit==="page"?`Enter a page from 0 to ${book.pageCount}.`:book.pageCount?"Enter a percentage from 0 to 100.":"Page count is unavailable. Track by percent instead.")}</small></label>
      <label className={styles.field}>Reading note (optional)<textarea aria-label="Reading note (optional)" placeholder="Add a thought to remember" maxLength={300} value={note} onChange={e=>edit(setNote,e.target.value)} disabled={pending}/><small>Private to you. Never used for recommendations.</small></label>
      {error&&<p className={styles.error} role="alert">{error}</p>}{conflict&&<FlowAction label="Refresh book and keep entries" onClick={refreshBase} secondary disabled={pending}/>}<div className={styles.sheetActions}><button type="submit" className={styles.button} disabled={pending||Boolean(invalid)}>{pending?"Saving progress…":error?"Try saving again":"Save progress"}</button>{<FlowAction label={"Cancel"} onClick={close} secondary={true} disabled={pending}/>}</div>
    </form>
  </BottomSheet></div>;
  const title=mode==="finish"?"Finish book":mode==="dnf"?"Move to Graveyard":mode==="restore"?"Graveyard":mode==="dates"?"Reading dates":"Current reading";
  let actions,content;
  if(saved){
    const heading=undone?"Update undone":saved.noChange?"No changes to save":saved.queued?"Saved on this device":mode==="finish"?"Marked as Finished":mode==="dnf"?"Moved to Graveyard":mode==="restore"?"Restored to Reading":mode==="dates"?"Reading dates saved":"Progress saved";
    content=<><ReadingBookSummary book={current} compact={mode!=="progress"}/><div className={styles.card} role="status"><h2>{heading}</h2><p>{undone?"Your reading record has been restored. Saved reflections remain private in Book Detail.":saved.noChange?"Your reading position is already up to date.":saved.queued?"This update will sync when you reconnect.":mode==="progress"?`${current.progressPercent}% complete. Your reading note is private.`:saved.learningUsed?"Your approved feedback is reflected in Reading DNA.":"Reading DNA unchanged. Your Library record is saved."}</p>{!undone&&!saved.noChange&&<FlowAction label={pending?"Undoing…":mode==="finish"?"Undo finish":mode==="dnf"?"Undo move":mode==="restore"?"Undo restore":"Undo last update"} onClick={undo} secondary={true} disabled={pending}/>}{saved.learningUsed&&!undone&&<Link className={styles.textButton} href="/dna">Review Reading DNA</Link>}</div>{error&&<p role="alert" className={styles.error}>{error}</p>}{current.status==="reading"&&current.progressPercent===100&&<p>Your progress is saved. Mark the book finished when you are ready.</p>}</>;
    actions=<>{<FlowAction label={"Back to reading"} onClick={close} secondary={false} disabled={pending}/>}<Link href={`/library/${current.id}`} className={`${styles.button} ${styles.secondary}`}>View book</Link></>;
  }else if(mode==="finish"){
    content=<><ReadingBookSummary book={book} compact/><div className={styles.step}>
      {step===0&&<><h2>How did it feel?</h2><p>Rate this book, or leave it unrated.</p><div className={styles.stars} role="group" aria-label="Book rating">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={`${n} ${n===1?"star":"stars"}`} aria-pressed={rating>=n} onClick={()=>edit(setRating,rating===n?null:n)}>{rating>=n?"★":"☆"}</button>)}</div><p>{rating?`${rating} out of 5${rating===5?" · Loved it":""}`:"No rating selected"}</p><p className={styles.muted}>You can change your rating later in Book Detail.</p><ReadingDates start={start} end={end} setStart={v=>edit(setStart,v)} setEnd={v=>edit(setEnd,v)}/></>}
      {step===1&&<><h2>What worked for you?</h2><p>Choose any. Leave blank to skip.</p><div className={styles.chips}>{finishChoices.map(choice=><button type="button" key={choice} aria-pressed={feedback.includes(choice)} onClick={()=>toggle(setFeedback,feedback,choice)}>{choice}</button>)}</div></>}
      {step===2&&<><h2>A note for future you</h2><p>Only for your records. This note is not used for AI personalisation.</p><label className={styles.field}>Your private note<textarea aria-label="Your private note" value={notes} onChange={e=>edit(setNotes,e.target.value)} maxLength={2000} rows={6}/><small>{notes.length}/2000</small></label></>}
      {step===3&&<><h2>Let Vela learn from this?</h2><p>Your rating and selected feedback can help future suggestions. Your private note is never shared.</p><div className={`${styles.card} ${styles.brass}`}><h2>You stay in control</h2><p>{home.snapshot?.personalisationEnabled?"Your separate rating and reading history permissions still apply. You can review Keep, Reduce or Stop in Reading DNA.":"Personalisation is off. This reflection will stay in your Library; learning remains off unless you enable the relevant permissions."}</p></div></>}
    </div></>;
    actions=step===3?<>{<FlowAction label={pending?"Finishing…":"Finish without learning"} onClick={()=>finish(false)} secondary={true} disabled={pending}/>}{<FlowAction label={"Use feedback and finish"} onClick={()=>finish(true)} secondary={true} disabled={pending}/>}</>:<>{<FlowAction label={step===0&&!rating?"Continue without rating":"Continue"} onClick={()=>{if(step===0&&dateError()){setError(dateError());return;}setStep(step+1);setError("");}} secondary={false} disabled={pending}/>}{<FlowAction label={step===0?"Finish without reflection":"Skip this step"} onClick={()=>step===0?finish(false,true):setStep(step+1)} secondary={true} disabled={pending}/>}</>;
  }else if(mode==="dnf"){
    content=<><ReadingBookSummary book={book} compact/><div className={styles.step}>{other?<><h2>A note for future you</h2><p>This note is private and is never used for suggestions.</p><label className={styles.field}>Other reason<textarea aria-label="Other reason" maxLength={300} value={privateReason} onChange={e=>edit(setPrivateReason,e.target.value)}/><small>{privateReason.length}/300 · Private to you</small></label></>:step===0?<><h2>Why did you stop?</h2><p>Choose any reason, or leave this blank.</p><div className={styles.chips}>{dnfChoices.map(choice=><button key={choice} type="button" aria-pressed={reasons.includes(choice)} onClick={()=>toggle(setReasons,reasons,choice)}>{choice}</button>)}</div>{<FlowAction label={"Other reason (private note)"} onClick={()=>setOther(true)} secondary={true} disabled={false}/>}<ReadingDates start={start} end={end} setStart={v=>edit(setStart,v)} setEnd={v=>edit(setEnd,v)} endLabel="End date · stopped reading"/><p className={styles.muted}>Your progress is kept. You can return to this book later.</p></>:<><h2>Use your reasons for suggestions?</h2><p>Only the reasons you select can be shared with Reading DNA.</p><div className={`${styles.card} ${styles.brass}`}><h2>A mood is not a fixed preference</h2><p>“Not in the mood” is never learned as a permanent preference. Your private note stays private. Your DNF data permission still applies.</p></div></>}</div></>;
    actions=other?<FlowAction label={"Save private note and return"} onClick={()=>setOther(false)} secondary={false} disabled={pending}/>:step===0?<>{<FlowAction label={"Continue"} onClick={()=>{if(dateError()){setError(dateError());return;}setStep(1);setError("");}} secondary={false} disabled={pending}/>}{<FlowAction label={"Move without a reason"} onClick={()=>{edit(setReasons,[]);request.current=null;const issue=dateError();if(issue){setError(issue);return;}submit({kind:"dnf",startedAt:start||null,stoppedAt:end,reasons:[],privateReason,useForLearning:false});}} secondary={true} disabled={pending}/>}</>:<>{<FlowAction label={pending?"Moving…":"Move without learning"} onClick={()=>dnf(false)} secondary={true} disabled={pending}/>}{<FlowAction label={"Use reasons and move"} onClick={()=>dnf(true)} secondary={true} disabled={pending||!reasons.length}/>}</>;
  }else if(mode==="dates"){
    content=<><ReadingBookSummary book={book} compact/><ReadingDates start={start} end={end} setStart={v=>edit(setStart,v)} setEnd={book.status==="finished"||book.status==="dnf"?v=>edit(setEnd,v):undefined} endLabel={book.status==="dnf"?"End date · stopped reading":"End date"}/></>;
    actions=<>{<FlowAction label={pending?"Saving dates…":"Save dates"} onClick={()=>{const issue=dateError();if(issue){setError(issue);return;}submit({kind:"reading_dates",startedAt:start||null,finishedAt:book.status==="finished"?end||null:null,stoppedAt:book.status==="dnf"?end||null:book.stoppedAt||null});}} secondary={false} disabled={pending}/>}{<FlowAction label={"Cancel"} onClick={close} secondary={true} disabled={pending}/>}</>;
  }else{
    content=<><ReadingBookSummary book={book} compact/><div className={styles.step}><h2>Return to this chapter?</h2><p>Restore to Reading at {book.progressPercent}%. Your reasons and private note stay available. Restoring does not tell Vela that you liked the book.</p></div></>;
    actions=<>{<FlowAction label={pending?"Restoring…":"Restore to Reading"} onClick={()=>submit({kind:"restore_reading"})} secondary={false} disabled={pending}/>}{<FlowAction label={"Cancel"} onClick={close} secondary={true} disabled={pending}/>}</>;
  }
  if(failed&&!saved){
    content=<><ReadingBookSummary book={book} compact/><div className={styles.step}><h2>{!home.online?"You are offline":"Your book was not saved"}</h2><p>{error}</p><p>Your rating, choices, dates and notes are kept here. Reading DNA has not changed.</p></div></>;
    actions=<><FlowAction label={pending?"Saving…":conflict?"Refresh book and keep entries":"Try again"} onClick={()=>conflict?refreshBase():submit(request.current)} disabled={pending}/><FlowAction label="Review my entries" onClick={()=>{setFailed(false);setError("");}} secondary disabled={pending}/></>;
  }
  return <div ref={dialog} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><ReadingShell title={title} subtitle={!saved&&(mode==="finish"||mode==="dnf")?`Step ${step+1} of ${mode==="finish"?4:2} · Reflection is optional`:saved?"Saved to your Library":null} overlay onBack={()=>{if(pending)return;if(saved){close();return;}if(other){setOther(false);return;}if(failed){setFailed(false);setError("");return;}if(step>0){setStep(step-1);setError("");return;}close();}} actions={actions}>{content}{!saved&&!failed&&error&&<p role="alert" className={styles.error}>{error}</p>}{pending&&<p role="status" className={styles.muted}>Saving your reading record…</p>}</ReadingShell></div>;
}
