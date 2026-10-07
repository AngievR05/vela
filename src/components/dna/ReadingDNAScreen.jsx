"use client";
import {useRef,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {authBody,authDisplay} from "@/components/auth/fonts";
import Button from "@/components/ui/Button";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import ReadingDNASignalCard from "./ReadingDNASignalCard";
import ReadingDNAEvidenceRow from "./ReadingDNAEvidenceRow";
import useReadingDNA from "./useReadingDNA";
import {createEntryId} from "@/lib/browser-id";
import styles from "./ReadingDNA.module.css";

function DNAAction({kind,label,...props}){return <Button variant={kind} className={styles[kind]} {...props}>{label}</Button>;}
const allowedViews=["overview","strong","emerging","unused","evidence","change","reduce","remove","updated","manage","explained","reset","reset-complete"];
export default function ReadingDNAScreen({userId,initialView}){
  const dna=useReadingDNA(userId);
  const [view,setView]=useState(allowedViews.includes(initialView)?initialView:"overview");
  const [selectedId,setSelectedId]=useState(null),[error,setError]=useState(""),[failedAction,setFailedAction]=useState(null),[pending,setPending]=useState(false),[changedAction,setChangedAction]=useState(null),[lastChange,setLastChange]=useState(null),[conflict,setConflict]=useState(false);
  const busy=useRef(false),operation=useRef(null),panel=useRef(null);
  const snapshot=dna.snapshot,selected=snapshot?.signals.find(signal=>signal.id===selectedId),online=dna.phase!=="offline";
  const strong=snapshot?.signals.filter(signal=>signal.strength==="strong")||[],emerging=snapshot?.signals.filter(signal=>signal.strength==="emerging")||[],unused=snapshot?.signals.filter(signal=>!signal.active)||[];
  const empty=!snapshot?.signals.some(signal=>signal.active),forming=!empty&&!strong.length&&emerging.length<=2;
  const undoable=lastChange||snapshot?.undoable;
  function move(next){if(busy.current)return;setError("");setView(next);panel.current?.scrollTo({top:0});}
  function open(signal){setSelectedId(signal.id);move("evidence");operation.current=null;}
  async function change(action){
    if(busy.current||!navigator.onLine)return;
    if(!operation.current||operation.current.action!==action)operation.current=action==="reset"?{action,operationId:createEntryId(),confirmation:"RESET"}:action==="undo"?{action,operationId:createEntryId(),changeId:undoable?.id}:{action,operationId:createEntryId(),signalId:selected?.id,expectedUpdatedAt:selected?.updatedAt};
    const payload=operation.current;busy.current=true;setPending(true);setError("");setConflict(false);setFailedAction(action);
    try{
      const response=await fetch("/api/dna",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
      if(response.status===401){window.location.replace("/login?next=/dna");return;}
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.saved){setConflict(response.status===409);throw new Error(result.error||"We couldn’t confirm your change. Your choice is still here.");}
      dna.saved(result.snapshot);setChangedAction(action);operation.current=null;setFailedAction(null);
      if(action==="reset"){setLastChange(null);setSelectedId(null);setView("reset-complete");}
      else if(action==="undo"){setLastChange(null);setView("evidence");}
      else{setLastChange({id:result.changeId,signalId:payload.signalId,action});setView("updated");}
      panel.current?.scrollTo({top:0});
    }catch(failure){setError(failure.name==="TimeoutError"||failure instanceof TypeError?"We couldn’t confirm the save. Your choice is still here; reconnect and retry.":failure.message);setView(action==="reset"?"reset-error":"change-error");}
    finally{busy.current=false;setPending(false);}
  }
  async function reviewFailed(){if(conflict){operation.current=null;setLastChange(null);await dna.refresh();if(failedAction==="undo"){move("evidence");return;}}else if(failedAction==="undo"){change("undo");return;}move(failedAction==="reduce"?"reduce":failedAction==="remove"?"remove":"change");}
  const settings=(<DNAAction kind="primary" label={"Personalisation settings"} onClick={null} disabled={pending} {...{href:"/settings?view=ai"}}/>);
  const library=(<DNAAction kind="tertiary" label={"Use my Library"} onClick={null} disabled={pending} {...{href:"/library"}}/>);
  const back=()=>move("overview");
  const card=(title,copy)=><section className={styles.card}><h3>{title}</h3><p>{copy}</p></section>;
  const signalCard=signal=><ReadingDNASignalCard key={signal.id} variant="dna" trait={signal.label} sourceSummary={signal.summary} className={`${styles.signal} ${signal.strength==="strong"?styles.strong:signal.strength==="off"?styles.off:""}`} onClick={()=>open(signal)} disabled={pending}/>;
  const loading=dna.phase==="loading";
  let title,body,actions,subtitle="Why Vela suggests books · You stay in control",compact=false;
  if(pending&&failedAction==="reset"){
    subtitle="Resetting your signals";title="Resetting Reading DNA…";body=<p>Clearing inferred signals and corrections. Your Library stays intact.</p>;actions=(<DNAAction kind="primary" label={"Resetting…"} onClick={null} disabled={pending} {...{disabled:true}}/>);
  }else if(loading){
    subtitle="Loading your signals";title="Loading your signals…";body=<><p>Gathering your approved reading activity.</p>{[0,1,2].map(key=><div className={`${styles.card} ${styles.skeleton}`} key={key} aria-hidden="true"/>)}</>;actions=(<DNAAction kind="primary" label={"Loading…"} onClick={null} disabled={pending} {...{disabled:true}}/>);
  }else if(!online){
    subtitle="Offline · Last saved view";title="You are offline";body=<p>Offline{snapshot?` · Last saved ${new Date(snapshot.fetchedAt).toLocaleDateString()}`:""}. Reconnect before reviewing evidence, changing signals or resetting. Current permissions remain unchanged.</p>;actions=<>{(<DNAAction kind="primary" label={"Try reconnecting"} onClick={dna.refresh} disabled={pending}/>)}{library}</>;
  }else if(dna.phase==="error"&&!error){
    subtitle="Signals could not load";title="Your Reading DNA is unavailable";body=<p>We couldn’t load your current signals and permissions. Please reconnect and try again.</p>;actions=<>{(<DNAAction kind="primary" label={"Try again"} onClick={dna.refresh} disabled={pending}/>)}{library}</>;
  }else if(view==="change-error"||view==="reset-error"){
    const reset=view==="reset-error";subtitle=reset?"Reset could not be confirmed":"Changes could not be confirmed";title=reset?"We couldn’t confirm the reset":"We couldn’t confirm your change";
    body=<><p>{error}</p><p className={styles.muted}>Retry safely, or reload the current saved state. Your books and reading history are preserved.</p></>;
    actions=<>{(<DNAAction kind="primary" label={reset?"Try again":"Review my change"} onClick={reset?()=>change("reset"):reviewFailed} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"Back to Reading DNA"} onClick={async()=>{operation.current=null;setLastChange(null);await dna.refresh();back();}} disabled={pending}/>)}</>;
  }else if(view==="reset-complete"){
    title="Reading DNA has been reset";body=<><p>Your inferred signals and corrections are cleared. Your books and reading history are still here.</p><p className={styles.muted}>Old activity will not immediately rebuild your DNA. New signals need future activity you allow. Your explicit reading preferences stay saved.</p></>;
    actions=<>{(<DNAAction kind="primary" label={"View Reading DNA"} onClick={back} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"Go to my Library"} onClick={null} disabled={pending} {...{href:"/library"}}/>)}</>;
  }else if(view==="reset"){
    title="Reset Reading DNA?";body=<><p>This clears inferred signals, their weights and your signal corrections.</p>{card("Your Library stays","Books, progress, ratings, private notes and reviews are not deleted.")}<p className={styles.muted}>Reset cannot be undone. Explicit setup preferences and privacy permissions stay saved. Cleared activity will not rebuild signals; only future permitted activity contributes.</p></>;
    actions=<>{(<DNAAction kind="primary" label={"Reset Reading DNA"} onClick={()=>change("reset")} disabled={pending} {...{className:`${styles.primary} ${styles.danger}`}}/>)}{(<DNAAction kind="tertiary" label={"Cancel"} onClick={()=>move("manage")} disabled={pending}/>)}</>;
  }else if(view==="explained"){
    compact=true;title="Evidence is not certainty";body=<><p>Reading DNA uses only preferences and activity you allow. Its patterns can change.</p>{card("Strong","At least three distinct approved evidence items support a pattern. It can still be wrong.")}{card("Emerging","Evidence is limited. Treat this as an early possibility. Chosen preferences are identified as your choices.")}{card("Not used","Excluded from suggestions. Your stored book history remains.")}<p className={`${styles.muted} ${styles.subtitle}`}>A rating alone does not explain why you liked a book. No percentage here claims to predict your taste.</p></>;
    actions=<>{(<DNAAction kind="primary" label={"Back to Reading DNA"} onClick={back} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"Personalisation settings"} onClick={null} disabled={pending} {...{href:"/settings?view=ai"}}/>)}</>;
  }else if(snapshot&&!snapshot.enabled&&view==="overview"){
    subtitle="Personalisation is off";title="Personalisation is off";body=<><p>Vela is not using Reading DNA for suggestions. Your Library and tracking still work.</p>{card("Your choice is respected","Your signals stay stored for review. Turning personalisation off does not delete your reading history.")}{(<DNAAction kind="secondary" label={"Review stored signals"} onClick={()=>move("unused")} disabled={pending}/>)}{view==="unused"&&unused.map(signalCard)}</>;
    actions=<>{settings}{library}</>;
  }else if(["evidence","change","reduce","remove","updated"].includes(view)&&selected){
    if(view==="evidence"){
      compact=true;title=selected.label;body=<><p className={styles.meta}>{selected.summary}</p><p>{selected.description}</p><h3 className={styles.subheading}>From your approved activity</h3>{selected.evidence.length?selected.evidence.map(item=><ReadingDNAEvidenceRow key={item.id} variant="dna" evidenceText={item.title} context={item.context} href={item.bookId?`/library/${item.bookId}`:undefined} className={`${styles.card} ${styles.evidence}`}/>):card("No approved evidence",selected.reason||"No current source is recorded for this signal.")}<p className={`${styles.muted} ${styles.subtitle}`}>An inferred preference is not a fact about you. Your choices can change.</p></>;
      actions=<>{(<DNAAction kind="primary" label={"Change this signal"} onClick={()=>move("change")} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"How evidence works"} onClick={()=>move("explained")} disabled={pending}/>)}</>;
    }else if(view==="updated"){
      title="Reading DNA updated";const copy=changedAction==="reduce"?"has less influence on suggestions":changedAction==="remove"?"is no longer used in suggestions":"is kept as you chose";
      body=<><p>{selected.label} {copy}.</p>{card(selected.label,changedAction==="reduce"?"Reduced influence":changedAction==="remove"?"Not used":"Kept")}<p className={styles.muted}>Your Library and reading history are unchanged.</p>{undoable&&(<DNAAction kind="secondary" label={"Undo change"} onClick={()=>change("undo")} disabled={pending}/>)}</>;
      actions=<>{(<DNAAction kind="primary" label={"Back to Reading DNA"} onClick={back} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"View signal evidence"} onClick={()=>move("evidence")} disabled={pending}/>)}</>;
    }else{
      title=view==="reduce"?"Give this less influence":view==="remove"?"Stop using this signal":"Does this sound like you?";
      body=<><h3 className={styles.subheading}>{selected.label}</h3><p>{view==="reduce"?"Vela will give this signal less weight in suggestions. It stays visible with its evidence.":view==="remove"?"This moves the signal to Not used. It will no longer influence suggestions until you choose to use it again.":"Keep it as it is, give it less influence, or stop using it. Your books and history stay intact."}</p>
        {view==="change"?<>{(<DNAAction kind="secondary" label={"Reduce its influence"} onClick={()=>{operation.current=null;move("reduce");}} disabled={pending} {...{className:`${styles.secondary} ${styles.tall}`}}/>)}{(<DNAAction kind="secondary" label={"Stop using this signal"} onClick={()=>{operation.current=null;move("remove");}} disabled={pending} {...{className:`${styles.secondary} ${styles.tall}`}}/>)}</>:<p className={styles.muted}>{view==="reduce"?"You can undo this after saving. Your Library is unchanged.":"Your books, ratings and progress are not deleted."}</p>}</>;
      actions=<>{(<DNAAction kind="primary" label={view==="reduce"?"Save reduced influence":view==="remove"?"Stop using signal":selected.storedActive?"Leave as it is":"Use this signal again"} onClick={()=>change(view==="reduce"?"reduce":view==="remove"?"remove":"keep")} disabled={pending} {...{loading:pending}}/>)}{(<DNAAction kind="tertiary" label={"Cancel"} onClick={()=>{operation.current=null;move("evidence");}} disabled={pending}/>)}</>;
    }
  }else if(["strong","emerging","unused","manage"].includes(view)){
    title=view==="strong"?"Strong signals":view==="emerging"?"Emerging signals":view==="unused"?"Signals not used":"Manage your signals";
    const items=view==="strong"?strong:view==="emerging"?emerging:view==="unused"?unused:[...strong,...emerging];
    body=<><p className={view==="manage"?"":styles.muted}>{view==="strong"?"More approved evidence supports these patterns. They can still be wrong.":view==="emerging"?"These patterns have limited evidence. They may change as you read.":view==="unused"?"These signals are excluded from suggestions. They will not be silently reused.":"Open a signal to inspect, reduce or stop using it."}</p>{items.length?items.map(signalCard):card("No signals in this group","No current signals match this group.")}{view==="manage"&&<>{(<DNAAction kind="secondary" label={"View signals not used"} onClick={()=>move("unused")} disabled={pending}/>)}{undoable&&(<DNAAction kind="secondary" label={"Undo last change"} onClick={()=>{setSelectedId(undoable.signalId);change("undo");}} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"Edit reading preferences"} onClick={null} disabled={pending} {...{href:"/setup"}}/>)}</>}</>;
    actions=view==="manage"?<>{settings}{(<DNAAction kind="tertiary" label={"Reset Reading DNA"} onClick={()=>move("reset")} disabled={pending}/>)}</>:<>{(<DNAAction kind="primary" label={"Back to Reading DNA"} onClick={back} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"Personalisation settings"} onClick={null} disabled={pending} {...{href:"/settings?view=ai"}}/>)}</>;
  }else if(empty){
    title="Your DNA starts with you";body=<><p>Reading DNA is a provisional picture of your preferences. It uses only the reading signals you allow.</p>{card("No signals yet","Set a few preferences, or keep using your Library without personalisation.")}{unused.length>0&&(<DNAAction kind="secondary" label={"View signals not used"} onClick={()=>move("unused")} disabled={pending}/>)}</>;
    actions=<>{(<DNAAction kind="primary" label={"Choose reading preferences"} onClick={null} disabled={pending} {...{href:"/setup"}}/>)}{library}</>;
  }else{
    compact=!forming;title=forming?"Still forming":"A picture, not a fixed identity";body=<><p className={forming?"":styles.muted}>{forming?"Early patterns can change. You can inspect or correct them at any time.":"Signals are provisional. Inspect the evidence or change what influences suggestions."}</p>
      {strong[0]&&<>{signalCard(strong[0])}{(<DNAAction kind="secondary" label={"View strong signals"} onClick={()=>move("strong")} disabled={pending}/>)}</>}
      {emerging.slice(0,forming?2:1).map(signalCard)}{!forming&&<>{(<DNAAction kind="secondary" label={"View emerging signals"} onClick={()=>move("emerging")} disabled={pending}/>)}{(<DNAAction kind="secondary" label={"View signals not used"} onClick={()=>move("unused")} disabled={pending}/>)}</>}</>;
    actions=forming?<>{(<DNAAction kind="primary" label={"See how signals are formed"} onClick={()=>move("explained")} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"Personalisation settings"} onClick={null} disabled={pending} {...{href:"/settings?view=ai"}}/>)}</>:<>{(<DNAAction kind="primary" label={"Manage my signals"} onClick={()=>move("manage")} disabled={pending}/>)}{(<DNAAction kind="tertiary" label={"How was this created?"} onClick={()=>move("explained")} disabled={pending}/>)}</>;
  }
  return <section className={`${styles.screen} ${authBody.variable} ${authDisplay.variable}`} aria-label="Reading DNA" aria-busy={pending||loading}>
    <div className={styles.art} aria-hidden="true"><Image className={styles.arch} src="/reading-dna/blush-reading-arch.svg" width={330} height={420} alt="" unoptimized priority/><Image className={styles.mist} src="/reading-dna/mist-pool.svg" width={430} height={440} alt="" unoptimized/><Image className={styles.orbit} src="/reading-dna/brass-orbit.svg" width={300} height={350} alt="" unoptimized/><span className={styles.edge}/><span className={styles.rule}/></div>
    <div className={styles.viewport} ref={panel}><div className={`${styles.content} ${compact?styles.compact:""}`}><header className={styles.header}>{view==="overview"?<Link href="/home" className={styles.back} aria-label="Back to Home">‹</Link>:<button className={styles.back} onClick={back} disabled={pending} aria-label="Back to Reading DNA">‹</button>}<h1>Reading DNA</h1></header><p className={styles.subtitle}>{subtitle}</p><h2 className={styles.title}>{title}</h2>{body}</div></div>
    <div className={styles.actions}>{actions}</div><BottomNavigation variant="home" assetDirectory="reading-dna" activePath="/dna" onNavigate={event=>{if(pending)event.preventDefault();}}/>
  </section>;
}
