"use client";
import {useRef,useState} from "react";
import ReadingShell from "./ReadingShell";
import {ReadingBookSummary} from "./ReadingFlow";
import {finishChoices} from "@/lib/reading-flow";
import styles from "./Reading.module.css";

export default function ReflectionEditor({book,home,onClose,onSaved}){
 const [feedback,setFeedback]=useState(book.finishFeedback||[]),[pending,setPending]=useState(false),[error,setError]=useState("");
 const [expectedUpdatedAt]=useState(book.updatedAt);
 const busy=useRef(false);
 const close=()=>{if(!busy.current)onClose();};
 async function save(){
  if(busy.current)return;busy.current=true;setPending(true);setError("");
  try{const result=await home.mutate({kind:"reflection",id:book.id,expectedUpdatedAt,feedback});onSaved(result.book);onClose();}
  catch(failure){setError(failure.message||"Your reflection was not saved. Your choices are still here; try again.");}
  finally{busy.current=false;setPending(false);}
 }
 return <ReadingShell overlay title="Edit reflection" subtitle="Saved reflection · Global permissions still apply" onBack={close}>
  <ReadingBookSummary book={book} compact/>
  <h2 className={styles.sectionHeading}>What worked for you?</h2><p className={styles.subtitle}>Choose any. Leave blank to skip.</p>
  <div className={`${styles.chips} ${styles.reflectionChoices}`} role="group" aria-label="Saved structured reflection">{finishChoices.map(choice=><button key={choice} type="button" aria-pressed={feedback.includes(choice)} disabled={pending} onClick={()=>{setFeedback(feedback.includes(choice)?feedback.filter(value=>value!==choice):[...feedback,choice]);setError("");}}>{choice}</button>)}</div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <button type="button" className={styles.button} onClick={save} disabled={pending}>{pending?"Saving reflection…":"Save reflection"}</button>
  <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={close} disabled={pending}>Cancel</button>
 </ReadingShell>;
}
