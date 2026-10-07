"use client";
import { createEntryId } from "@/lib/browser-id";
import { useCallback, useEffect, useRef, useState } from "react";
import DiscoverShell from "./DiscoverShell";
import RecommendationDetail from "./RecommendationDetail";
import { discoveryCacheKey, discoveryDraftKey, discoveryFiltersSchema, recommendationRequestSchema, parseRecommendationSession } from "@/lib/validation/recommendation";
import TextArea from "@/components/ui/TextArea";
import FilterChip from "@/components/ui/FilterChip";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InlineAlert from "@/components/ui/InlineAlert";
import BottomSheet from "@/components/feedback/BottomSheet";
import RadioOption from "@/components/ui/RadioOption";
import BookCover from "@/components/books/BookCover";
import styles from "./Discover.module.css";
import {activityEventKey} from "@/lib/reading-activity-events";
const initialFilters={source:"anywhere",genre:"",mood:"",length:"any"};
const groups=[{key:"source",label:"SOURCE",values:[["anywhere","From anywhere"],["tbr","From my TBR"]]},
  {key:"genre",label:"GENRE",values:[["","Any genre"],["Fantasy","Fantasy"],["Romance","Romance"],["Literary","Literary"]]},
  {key:"mood",label:"MOOD",values:[["","Any mood"],["Emotional","Emotional"],["Hopeful","Hopeful"],["Dark","Dark"]]},
  {key:"length",label:"LENGTH",values:[["any","Any length"],["300","Under 300p"],["500","Under 500p"]]}];
export default function DiscoverScreen({ userId }) {
  const [request,setRequest]=useState("");const [filters,setFilters]=useState(initialFilters);const [draft,setDraft]=useState(initialFilters);
  const [session,setSession]=useState(null);const [selected,setSelected]=useState(null);const [view,setView]=useState("request");
  const [state,setState]=useState("idle");const [error,setError]=useState("");const [online,setOnline]=useState(true);const [focused,setFocused]=useState(false);
  const [filterOpen,setFilterOpen]=useState(false);const [help,setHelp]=useState(false);const [hydrated,setHydrated]=useState(false);
  const [dnaChanged,setDNAChanged]=useState(false);
  const entryId=useRef(null);const busy=useRef(false);const revision=useRef(0);
  const close=useCallback(()=>setFilterOpen(false),[]);
  const keepSession=useCallback(value=>{setSession(value);try{localStorage.setItem(discoveryCacheKey(userId),JSON.stringify(value));}catch{/* Saved sessions are also stored in Supabase. */}},[userId]);
  useEffect(()=>{
    function changed(event){if(event.type==="storage"&&event.key!==activityEventKey(userId))return;if(event.detail?.userId&&event.detail.userId!==userId)return;entryId.current=null;revision.current+=1;setDNAChanged(true);}
    window.addEventListener("vela:dna-changed",changed);window.addEventListener("storage",changed);
    return()=>{window.removeEventListener("vela:dna-changed",changed);window.removeEventListener("storage",changed);};
  },[userId]);
  useEffect(()=>{
    let active=true;
    function connection(){setOnline(navigator.onLine);}
    async function init(){
      if(!active)return;connection();
      try{
        const cached=parseRecommendationSession(JSON.parse(localStorage.getItem(discoveryCacheKey(userId))),userId);if(cached)setSession(cached);
        const saved=JSON.parse(localStorage.getItem(discoveryDraftKey(userId)));const valid=discoveryFiltersSchema.safeParse(saved?.filters);
        if(valid.success&&typeof saved.request==="string"&&saved.request.length<=240){setRequest(saved.request);setFilters(valid.data);}
      }catch{/* Storage is optional for online discovery. */}
      if(active)setHydrated(true);
      if(!navigator.onLine)return;
      try{const startRevision=revision.current;const response=await fetch("/api/recommendations",{cache:"no-store",signal:AbortSignal.timeout(20000)});
        if(response.status===401){window.location.replace("/login?next=/discover");return;}
        const body=await response.json();if(!response.ok)throw new Error("Saved results unavailable");
        const saved=parseRecommendationSession(body.session,userId);
        if(active&&revision.current===startRevision){if(saved)keepSession(saved);else if(!body.session){setSession(null);localStorage.removeItem(discoveryCacheKey(userId));}}
      }catch{if(active)setError("Saved recommendations could not refresh. You can retry or use the copy on this device.");}
    }
    Promise.resolve().then(init);window.addEventListener("online",connection);window.addEventListener("offline",connection);
    return()=>{active=false;window.removeEventListener("online",connection);window.removeEventListener("offline",connection);};
  },[userId,keepSession]);
  useEffect(()=>{if(hydrated)try{localStorage.setItem(discoveryDraftKey(userId),JSON.stringify({request,filters}));}catch{/* Keep the in-memory request available. */}},[request,filters,hydrated,userId]);
  function edit(value){setRequest(value);entryId.current=null;setState("idle");setError("");}
  function openFilters(asHelp=false){setDraft(filters);setHelp(asHelp);setFilterOpen(true);}
  async function generate(event){
    event?.preventDefault();if(busy.current)return;
    if(!navigator.onLine){setOnline(false);return;}
    const input=recommendationRequestSchema.safeParse({entryId:entryId.current||createEntryId(),request,filters});
    if(!input.success){setState("context");setError("");return;}
    entryId.current=input.data.entryId;busy.current=true;setFocused(false);setState("loading");setError("");
    try{
      const response=await fetch("/api/recommendations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input.data),signal:AbortSignal.timeout(150000)});
      if(response.status===401){window.location.replace("/login?next=/discover");return;}
      const body=await response.json();if(!response.ok)throw new Error(body.error);
      if(body.session){const value=parseRecommendationSession(body.session,userId);if(!value)throw new Error("Saved results unavailable");revision.current+=1;keepSession(value);entryId.current=null;setView("results");setState("idle");setSelected(null);setDNAChanged(false);}
      else if(["context","no-match"].includes(body.state))setState(body.state);else throw new Error("Invalid recommendation response");
    }catch(failure){setState("error");setError(failure.name==="Error"&&failure.message?failure.message:"Recommendations are temporarily unavailable. Your request is still here; please try again.");}
    finally{busy.current=false;}
  }
  function updateSession(value){revision.current+=1;keepSession(value);}
  const recommendation=session?.recommendations.find(rec=>rec.id===selected);
  if(view==="detail"&&recommendation)return <RecommendationDetail key={recommendation.id} userId={userId} session={session} recommendation={recommendation} online={online} onSession={updateSession} onBack={()=>setView("results")}/>;
  if(view==="results"&&session)return <DiscoverShell title="Recommendations" subtitle="For your current request" onBack={()=>setView("request")}>
    <h2 className={`${styles.intro} ${styles.resultsIntro}`}>Three possibilities,<br/>not an endless feed.</h2>
    {!online&&<InlineAlert type="info">You’re offline. These are your saved results.</InlineAlert>}
    {dnaChanged&&<InlineAlert type="info">Your Reading DNA changed. Refine your request to find fresh matches using your latest activity.</InlineAlert>}
    <div className={styles.results}>{session.recommendations.map(rec=><button key={rec.id} type="button" className={styles.result} onClick={()=>{setSelected(rec.id);setView("detail");}} aria-label={`View recommendation: ${rec.book.title}`}>
      <BookCover title={rec.book.title} author={rec.book.authors.join(", ")} src={rec.book.thumbnailUrl} size="search" className={styles.resultCover} decorative/>
      <div><span className={`${styles.pill} ${rec.confidence==="Experimental"?styles.experimental:""}`}>Vela · {rec.confidence==="Good match"?"Explore":rec.confidence}</span><h3>{rec.book.title}</h3><p>{rec.book.authors.join(", ")||"Author unavailable"}</p><small>{rec.reason}</small></div>
    </button>)}</div><p className={styles.muted}>Your request: {session.request}</p><Button variant="tertiary" onClick={()=>setView("request")}>Refine request</Button>
  </DiscoverShell>;
  const unavailable=!online?"offline":state;
  const statuses={context:["MORE CONTEXT NEEDED","What mood would you like?","Add a mood or genre to this request. You can also browse your saved books."],
    "no-match":["NO CLOSE MATCH","No close match yet.","Try a broader request or fewer filters. Vela won’t invent three matches."],error:["SERVICE UNAVAILABLE","Recommendations unavailable.","Your Library and tracking still work. Your request is retained."],
    offline:["OFFLINE","You’re offline.","Reconnect to create new recommendations. Saved results remain available."]};
  const failure=statuses[unavailable];
  const applied=[filters.source==="tbr"?"From my TBR":null,filters.genre,filters.mood,filters.length!=="any"?`Under ${filters.length} pages`:null].filter(Boolean);
  return <DiscoverShell title="Discover" showNavigation={!focused} subtitle={state==="loading"?"Finding suitable books":failure?failure[0].toLowerCase():focused?"Describe the read you want":"Tell Vela what fits now"}>
    {failure?<Card className={`${styles.panel} ${unavailable==="error"?styles.purple:unavailable==="offline"?styles.green:""}`}><span className={styles.pill}>{failure[0]}</span><h2>{failure[1]}</h2><p>{unavailable==="error"&&error?error:failure[2]}</p>
      {unavailable==="context"?<Button className={styles.primary} onClick={()=>setState("idle")}>Edit request</Button>:<Button className={styles.primary} onClick={unavailable==="no-match"?()=>openFilters():unavailable==="offline"?()=>{setOnline(navigator.onLine);if(navigator.onLine)setState("idle");}:generate}>{unavailable==="offline"?"Retry connection":unavailable==="no-match"?"Relax filters":"Try again"}</Button>}
      {["no-match","error"].includes(unavailable)&&<Button variant="secondary" className={`${styles.primary} ${styles.secondary}`} onClick={()=>{setState("idle");setError("");}}>Edit request</Button>}{unavailable!=="no-match"&&<Button href="/library" variant="secondary" className={`${styles.primary} ${styles.secondary}`}>{unavailable==="context"||unavailable==="offline"?"View saved books":"Open Library"}</Button>}
    </Card>:<><h2 className={styles.intro}>What do you feel<br/>like reading?</h2><form className={styles.form} onSubmit={generate}>
      <TextArea id="reading-request" label={!request&&!focused?"EXAMPLE REQUEST · TAP TO WRITE":"YOUR READING REQUEST"} placeholder="Something romantic, high-stakes and fast-paced." value={request} onChange={event=>edit(event.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} maxLength={240} rows={2} disabled={state==="loading"} className={styles.request} helperText={focused||request?`${request.length} / 240`:"Try a mood, pace or kind of story."}/>
      {!focused&&<div className={styles.filters}>{applied.length?applied.map(label=><FilterChip key={label} className={styles.chip} selected={!label.startsWith("Under")} disabled={state==="loading"} onClick={()=>openFilters()}>{label}</FilterChip>):["From my TBR","Genre","Mood"].map(label=><FilterChip key={label} className={styles.chip} disabled={state==="loading"} onClick={()=>openFilters()}>{label}</FilterChip>)}</div>}
      {state!=="loading"&&<Button type="submit" className={styles.primary} onPointerDown={event=>event.preventDefault()}>Find my next read</Button>}
    </form>{state==="loading"&&<div role="status" aria-label="Finding three books" className={styles.results}>{[0,1,2].map(key=><div className={styles.skeletonCard} key={key} aria-hidden="true"><span className={styles.skeletonCover}/><div className={styles.skeletonLines}><span/><span/><span/></div></div>)}</div>}{applied.length>0&&state!=="loading"&&<Card className={styles.facts}><strong>{applied.length} {applied.length===1?"filter":"filters"} applied</strong><p>{applied.join(" · ")}</p></Card>}<p className={styles.muted}>Vela uses only Reading DNA signals you permitted.</p></>}
    {session&&<Button variant="secondary" onClick={()=>setView("results")}>View saved recommendations</Button>}
    {error&&state!=="error"&&<InlineAlert type="info">{error}</InlineAlert>}
    <BottomSheet className={styles.sheet} backdropClassName={styles.sheetBackdrop} showHandle={false} open={filterOpen} title="Refine the request" onClose={close}><div className={styles.form}>{groups.map(group=><fieldset key={group.key} className={styles.choiceGroup}><legend>{group.label}</legend><div className={styles.options}>{group.values.map(([value,label])=><RadioOption key={value} id={`discover-${group.key}-${value||"any"}`} name={group.key} value={value} label={label} checked={draft[group.key]===value} onChange={()=>setDraft({...draft,[group.key]:value})}/>)}</div></fieldset>)}
      <div className={styles.row}><Button className={`${styles.primary} ${styles.secondary}`} variant="secondary" onClick={()=>setDraft(initialFilters)}>Clear all</Button><Button className={styles.primary} onClick={()=>{setFilters(draft);entryId.current=null;setFilterOpen(false);setState("idle");if(help&&!request.trim())setRequest(draft.genre||draft.mood?`A ${draft.mood.toLowerCase()} ${draft.genre.toLowerCase()} book.`:"Surprise me with three different books.");}}>Apply filters</Button></div>
    </div></BottomSheet>
  </DiscoverShell>;
}
