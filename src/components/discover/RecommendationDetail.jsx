"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import DiscoverShell from "./DiscoverShell";
import { parseRecommendationSession } from "@/lib/validation/recommendation";
import { libraryBookSchema } from "@/lib/home-data";
import { plainDescription } from "@/lib/library-data";
import BookCover from "@/components/books/BookCover";
import ReadingDNACorrectionControl from "@/components/dna/ReadingDNACorrectionControl";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import RadioOption from "@/components/ui/RadioOption";
import FilterChip from "@/components/ui/FilterChip";
import TextArea from "@/components/ui/TextArea";
import InlineAlert from "@/components/ui/InlineAlert";
import BottomSheet from "@/components/feedback/BottomSheet";
import styles from "./Discover.module.css";
import {notifyReadingActivity} from "@/lib/reading-activity-events";
const reasons=["Not in the mood","Wrong genre","Pacing is not important","I don’t care about this trope","Other"];
const sources={onboarding:"Chosen during reading setup",manual:"Chosen by you",correction:"Corrected by you",rating:"From your permitted ratings",history:"From your permitted completed reading",dnf:"From DNF reasons you approved"};
export default function RecommendationDetail({ userId,session,recommendation:rec,online,onSession,onBack }) {
  const [savedBook,setSavedBook]=useState(null);
  const [stage,setStage]=useState("detail");const [expanded,setExpanded]=useState(false);const [signalId,setSignalId]=useState(null);
  const [modal,setModal]=useState(false);const [reason,setReason]=useState("");const [other,setOther]=useState("");
  const [pending,setPending]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [recorded,setRecorded]=useState(null);
  const busy=useRef(false);const [lastFeedback,setLastFeedback]=useState(null);
  const close=useCallback(()=>{if(!busy.current)setModal(false);},[]);
  const book=rec.book,signal=rec.signals.find(item=>item.id===signalId);
  const facts=[book.categories.join(" · "),book.publishedDate?`Published ${book.publishedDate}`:null,book.pageCount?`${book.pageCount} pages`:null].filter(Boolean);
  const back=()=>{if(busy.current)return;if(stage==="detail")onBack();else if(stage==="correction")setStage("assumptions");else {setStage("detail");setError("");}};
  const bookHref=rec.libraryId?`/library/${rec.libraryId}`:`/discover/books/${encodeURIComponent(book.googleBooksId)}`;
  const hero=<Card className={styles.hero}><Link href={bookHref} aria-label={`Open book detail: ${book.title}`} onClick={event=>{if(!online){event.preventDefault();setStage("book");}}}>
    <BookCover title={book.title} author={book.authors.join(", ")} src={book.thumbnailUrl} size="card" className={styles.heroCover} decorative/>
  </Link><div><span className={`${styles.pill} ${rec.confidence==="Experimental"?styles.experimental:""}`}>{rec.confidence}</span><h2>{book.title}</h2><p>{book.authors.join(", ")||"Author unavailable"}</p><small>{[book.categories[0],book.publishedDate?.slice(0,4)].filter(Boolean).join(" · ")}</small></div></Card>;
  async function feedback(value){
    if(busy.current)return;busy.current=true;setPending(true);setError("");setLastFeedback(value);
    try{
      const response=await fetch(`/api/recommendations/${rec.id}/feedback`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value),signal:AbortSignal.timeout(20000)});
      if(response.status===401){window.location.replace("/login?next=/discover");return;}
      const body=await response.json();if(!response.ok)throw new Error(body.error||"We couldn’t confirm your feedback. Please try again.");
      const updated=parseRecommendationSession(body.session,userId);if(!updated||updated.id!==session.id)throw new Error("We couldn’t confirm your feedback. Please try again.");
      onSession(updated);if(["correct","show_less","undo_less"].includes(value.action))notifyReadingActivity(userId);setModal(false);setNotice("");setRecorded(value.action);setStage(value.action==="undo_less"?"detail":"recorded");
      if(value.action==="undo_less")setNotice("Future preference undone. Your Reading DNA is unchanged.");
    }catch(failure){setModal(false);setError(failure.name==="TimeoutError"||failure instanceof TypeError?"We couldn’t connect. Your feedback selection is still here; please try again.":failure.message);}
    finally{busy.current=false;setPending(false);}
  }
  async function save(){
    if(busy.current)return;busy.current=true;setPending(true);setError("");
    try{
      const response=await fetch("/api/library",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({googleBooksId:book.googleBooksId}),signal:AbortSignal.timeout(20000)});
      if(response.status===401){window.location.replace("/login?next=/discover");return;}
      const body=await response.json();if(!response.ok)throw new Error(body.error||"We couldn’t save this book. Please try again.");
      const result=libraryBookSchema.safeParse(body.book);if(!result.success)throw new Error("We couldn’t confirm the saved book. Please try again.");
      onSession({...session,recommendations:session.recommendations.map(item=>item.id===rec.id?{...item,libraryId:result.data.id}:item)});
      if(!body.duplicate){setSavedBook(result.data);setStage("saved");}
      notifyReadingActivity(userId);
      setNotice(body.duplicate?"Already in your Library. Your reading status and progress were kept.":body.restored?"Restored to your Library. Your reading status and notes were kept.":"Added to TBR. The book is waiting on your shelf.");
    }catch(failure){setError(failure.name==="TimeoutError"||failure instanceof TypeError?"We couldn’t connect. Your selection is still here; please try again.":failure.message);}
    finally{busy.current=false;setPending(false);}
  }
  async function undoSave(){
    if(busy.current||!savedBook||!online)return;busy.current=true;setPending(true);setError("");
    try{const response=await fetch('/api/library/'+savedBook.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"remove",id:savedBook.id,expectedUpdatedAt:savedBook.updatedAt}),signal:AbortSignal.timeout(20000)});
      if(response.status===401){window.location.replace("/login?next=/discover");return;}
      const body=await response.json();if(!response.ok)throw new Error(body.error||"We couldn’t confirm Undo. Please retry.");
      const parsed=libraryBookSchema.safeParse(body.book);if(!parsed.success||!parsed.data.isRemoved)throw new Error("Undo could not be confirmed.");
      onSession({...session,recommendations:session.recommendations.map(item=>item.id===rec.id?{...item,libraryId:null}:item)});
      setSavedBook(null);setStage("detail");setNotice("Save undone. The book is no longer on your shelf.");notifyReadingActivity(userId);
    }catch(failure){setError(failure.message);}finally{busy.current=false;setPending(false);}
  }
  const actions=<div className={`${styles.row} ${styles.feedbackActions}`}><Button variant="secondary" className={styles.primary} disabled={!online||pending} onClick={()=>feedback({action:"helpful"})}>Helpful</Button><Button variant="secondary" className={styles.primary} disabled={!online||pending} onClick={()=>{setModal(true);setError("");}}>Not for me</Button></div>;
  if(error&&lastFeedback&&!modal)return <DiscoverShell title="Recommendation" subtitle="Feedback could not be confirmed" onBack={()=>{setError("");setStage("detail");}} showNavigation={false}>
    <Card className={styles.failure+" "+styles.panel}><span className={styles.pill}>Save unconfirmed</span><h2>We couldn’t confirm your feedback.</h2><p>{error}</p><Button className={styles.primary} loading={pending} disabled={!online} onClick={()=>feedback(lastFeedback)}>Try again</Button><Button className={styles.primary+" "+styles.secondary} disabled={pending} onClick={()=>{setError("");if(lastFeedback.action==="not_for_me")setModal(true);}}>Cancel</Button></Card>
  </DiscoverShell>;
  return <DiscoverShell title={stage==="why"?"Why this book?":stage==="book"?"Book detail":"Recommendation"} subtitle={stage==="assumptions"?"Review an assumption":stage==="show-less"?"Reduce this pattern":stage==="saved"?"Saved to your TBR":stage==="recorded"?"Feedback saved":stage==="why"?"Book facts and personal signals":"Why this may fit"} onBack={back} showNavigation={!["assumptions","correction","show-less"].includes(stage)&&!signal}>
    {!online&&<InlineAlert type="info">You’re offline. Saved facts and results are available; reconnect to save changes.</InlineAlert>}
    {(["detail","book","saved"].includes(stage)||(stage==="why"&&(!expanded||signal))||(stage==="recorded"&&recorded==="helpful"))&&hero}
    {stage==="detail"&&<><Card className={styles.facts}><h2>{rec.confidence==="Experimental"?"A thoughtful stretch":"Why it may fit now"}</h2><p>{rec.reason}</p></Card>
      <Button variant="secondary" className={`${styles.primary} ${styles.secondary}`} onClick={()=>setStage("why")}>Why Vela suggested this</Button>
      {rec.libraryId?<Button href={`/library/${rec.libraryId}`} className={styles.primary} disabled={!online}>View in Library</Button>:<Button className={styles.primary} onClick={save} loading={pending} disabled={!online}>Save to TBR</Button>}{actions}
      {rec.feedback&&<p className={styles.muted}>{rec.feedback.preference_effect==="show_less"?"Future preference: show less like this.":rec.feedback.feedback==="helpful"?"Helpful recorded for this session.":"Not for me recorded for this session."}</p>}
      {rec.feedback?.preference_effect==="show_less"&&<Button variant="tertiary" onClick={()=>feedback({action:"undo_less"})} disabled={!online||pending}>Undo future preference</Button>}
    </>}
    {stage==="book"&&<><Card className={styles.facts}><h2>Book facts</h2><ul>{facts.map(fact=><li key={fact}>{fact}</li>)}</ul><p>{plainDescription(book.description)||"No description is available from Google Books."}</p><small>Book facts · Google Books</small></Card><Button variant="secondary" onClick={()=>setStage("detail")}>Back to recommendation</Button></>}
    {stage==="saved"&&<><Card className={styles.facts}><span className={styles.pill}>From the book</span><ul>{facts.map(fact=><li key={fact}>{fact}</li>)}</ul></Card><Card className={styles.facts}><h2>Added to TBR.</h2><p>The book is waiting on your shelf.</p></Card><Button href={bookHref} className={styles.primary}>View in Library</Button>{savedBook&&<Button className={styles.primary} onClick={undoSave} loading={pending} disabled={!online}>Undo save</Button>}</>}
    {stage==="why"&&<><Card className={styles.facts}><span className={styles.pill}>From the book</span><ul>{facts.map(fact=><li key={fact}>{fact}</li>)}</ul>{book.description&&<p>{plainDescription(book.description).slice(0,500)}</p>}<p className={styles.muted}>Book facts · Google Books. Recommendation fit is Vela’s interpretation.</p></Card>
      <Card className={`${styles.facts} ${styles.dna}`}><Button className={styles.dnaHeading} variant="tertiary" onClick={()=>{setExpanded(!expanded);setSignalId(null);}} aria-expanded={expanded}>From your Reading DNA</Button>{!expanded&&<p>{rec.signals.length} {rec.signals.length===1?"signal":"signals"} · Expand to inspect ›</p>}
        {expanded&&(rec.signals.length?<ul>{rec.signals.map(item=><li key={item.id}><button type="button" onClick={()=>setSignalId(item.id)} aria-pressed={signalId===item.id}>{item.label} · {item.strength}{item.evidence.length?` · ${item.evidence.length} ${item.evidence.length===1?"source":"sources"}`:""}</button></li>)}</ul>:<p>No current permitted Reading DNA evidence is available for this suggestion. It is based on your request and book facts.</p>)}
      </Card>{signal&&<div className={styles.evidence}><h2>Evidence behind “{signal.label}”</h2><p className={styles.muted}>{sources[signal.source]||"Your permitted reading choices"}</p>{signal.evidence.length?signal.evidence.map(item=><Link key={item.id} href={`/library/${item.id}`}><span>{item.title}</span><small>{sources[signal.source]||"Permitted reading evidence"}</small></Link>):<p>This signal was chosen directly; it has no linked book evidence.</p>}<Button className={styles.primary} onClick={()=>setStage("correction")} disabled={!online}>Review this signal</Button></div>}{actions}
    </>}
    {stage==="assumptions"&&<Card className={`${styles.panel} ${styles.purple}`}><h2>Doesn’t feel like me.</h2><p>Which assumption should Vela revisit?</p>
      {rec.signals.length?rec.signals.map(item=><FilterChip key={item.id} className={styles.chip} selected={signalId===item.id} onClick={()=>setSignalId(item.id)}>{item.label} · {item.strength}</FilterChip>):<p>No permitted Reading DNA signal was used for this suggestion.</p>}
      <p>Opening a signal lets you Keep, Reduce importance or Remove it.</p><Button className={styles.primary} onClick={()=>setStage("correction")} disabled={!signal||!online}>Review selected signal</Button>
    </Card>}
    {stage==="correction"&&signal&&<Card className={`${styles.panel} ${styles.purple}`}><h2>{signal.label}</h2><p>{sources[signal.source]||"Your reading choice"}. This changes the signal’s future importance.</p><ReadingDNACorrectionControl saving={pending} onSave={correction=>feedback({action:"correct",signalId:signal.id,correction})}/></Card>}
    {stage==="show-less"&&<Card className={`${styles.panel} ${styles.green}`}><h2>Show less like this?</h2><p>Vela will reduce this recommendation pattern without deleting book history or a Reading DNA signal.</p><span className={styles.pill}>Pattern: {book.categories[0]||book.title}</span>
      {!session.personalisationEnabled&&<p>Personalisation is off. <Link href="/setup">Edit your data choices</Link> to use future preferences.</p>}
      <Button className={styles.primary} disabled={!online||!session.personalisationEnabled} loading={pending} onClick={()=>feedback({action:"show_less"})}>Show less like this</Button><Button variant="secondary" className={`${styles.primary} ${styles.secondary}`} onClick={()=>setStage("detail")} disabled={pending}>Cancel</Button>
    </Card>}
    {stage==="recorded"&&<>{recorded==="helpful"&&<Card className={`${styles.facts} ${styles.dna}`}><span className={styles.pill}>From your Reading DNA</span>{rec.signals.length?<ul>{rec.signals.map(item=><li key={item.id}>{item.label} · {item.strength}</li>)}</ul>:<p>This suggestion used your request and book facts.</p>}</Card>}<Card className={recorded==="helpful"?styles.facts:`${styles.panel} ${styles.success}`}><span className={styles.pill}>Feedback saved</span><h2>{recorded==="show_less"?"Future suggestions will show less of this.":recorded==="correct"?"Your signal choice is saved.":recorded==="helpful"?"Helpful recorded.":"Feedback recorded."}</h2><p>{recorded==="show_less"?"Your Reading DNA signals were not removed.":recorded==="correct"?"Future recommendations will respect this explicit signal change.":"This feedback is recorded for this recommendation session only. Your Reading DNA is unchanged."}</p></Card><Button className={styles.primary} onClick={onBack}>Back to recommendations</Button>
      {recorded==="show_less"&&<Button variant="secondary" className={`${styles.primary} ${styles.secondary}`} onClick={()=>feedback({action:"undo_less"})} loading={pending} disabled={!online}>Undo change</Button>}
    </>}
    {notice&&<InlineAlert type="success">{notice}</InlineAlert>}{error&&!modal&&<InlineAlert type="error">{error}</InlineAlert>}
    {error&&!modal&&lastFeedback&&<Button variant="secondary" onClick={()=>feedback(lastFeedback)} loading={pending}>Try again</Button>}
    <BottomSheet className={styles.sheet} backdropClassName={styles.sheetBackdrop} showHandle={false} open={modal} title="What missed the mark?" onClose={close}><div className={styles.feedbackForm}><p>Choose one. This does not automatically change Reading DNA.</p>
      {reasons.map(value=><RadioOption key={value} id={`feedback-${reasons.indexOf(value)}`} name="feedback-reason" value={value} label={value} checked={reason===value} onChange={()=>setReason(value)} disabled={pending}/>)}
      {reason==="Other"&&<TextArea id="other-feedback" label="Your reason" value={other} onChange={event=>setOther(event.target.value)} maxLength={250} rows={2} disabled={pending}/>}
      {error&&<InlineAlert type="error">{error}</InlineAlert>}<Button className={styles.primary} onClick={()=>feedback({action:"not_for_me",reason:reason==="Other"?other.trim():reason})} loading={pending} disabled={!online||!reason||(reason==="Other"&&!other.trim())}>Save feedback</Button>
      <Button variant="secondary" className={`${styles.primary} ${styles.secondary}`} disabled={pending} onClick={()=>{setModal(false);setStage("assumptions");setError("");}}>Doesn’t feel like me</Button><Button variant="secondary" className={`${styles.primary} ${styles.secondary}`} disabled={pending} onClick={()=>{setModal(false);setStage("show-less");setError("");}}>Show less like this</Button>
    </div></BottomSheet>
  </DiscoverShell>;
}
