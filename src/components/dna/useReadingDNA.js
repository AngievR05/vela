"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {dnaCacheKey,dnaSnapshotSchema,parseDNASnapshot} from "@/lib/reading-dna";
import {homeCacheKey} from "@/lib/home-data";
import {discoveryCacheKey} from "@/lib/validation/recommendation";
export default function useReadingDNA(userId){
  const [snapshot,setSnapshot]=useState(null),[phase,setPhase]=useState("loading");
  const active=useRef(false),revision=useRef(0),loading=useRef(false),generation=useRef(0),queued=useRef(false);
  const publish=useCallback(value=>{const parsed=dnaSnapshotSchema.safeParse(value);if(!parsed.success||parsed.data.userId!==userId)throw new Error("Your saved signals could not be verified.");if(active.current)setSnapshot(parsed.data);try{localStorage.setItem(dnaCacheKey(userId),JSON.stringify(parsed.data));}catch{/* Online use does not require storage. */}},[userId]);
  const refresh=useCallback(async function refreshCurrent(){
    if(!active.current)return;
    if(loading.current){queued.current=true;return;}
    if(!navigator.onLine){setPhase("offline");return;}
    loading.current=true;const current=revision.current,run=generation.current;
    try{const response=await fetch("/api/dna",{cache:"no-store",signal:AbortSignal.timeout(20000)});
      if(response.status===401){window.location.replace("/login?next=/dna");return;}if(!response.ok)throw new Error("Unavailable");
      const body=await response.json();if(active.current&&run===generation.current&&current===revision.current){publish(body);setPhase(navigator.onLine?"ready":"offline");}
    }catch{if(active.current&&run===generation.current&&current===revision.current)setPhase(navigator.onLine?"error":"offline");}finally{if(run===generation.current){loading.current=false;if(queued.current){queued.current=false;refreshCurrent();}}}
  },[publish]);
  useEffect(()=>{
    let live=true;active.current=true;generation.current+=1;loading.current=false;
    function init(){if(!live)return;try{const saved=parseDNASnapshot(localStorage.getItem(dnaCacheKey(userId)),userId);if(saved)setSnapshot(saved);}catch{/* Optional storage. */}refresh();}
    function offline(){setPhase("offline");}function resume(){if(document.visibilityState==="visible")refresh();}
    Promise.resolve().then(init);window.addEventListener("offline",offline);window.addEventListener("online",resume);window.addEventListener("vela:dna-changed",resume);document.addEventListener("visibilitychange",resume);
    return()=>{live=false;active.current=false;generation.current+=1;window.removeEventListener("offline",offline);window.removeEventListener("online",resume);window.removeEventListener("vela:dna-changed",resume);document.removeEventListener("visibilitychange",resume);};
  },[userId,refresh]);
  function saved(value){if(!active.current)return;revision.current+=1;try{localStorage.removeItem(homeCacheKey(userId));localStorage.removeItem(discoveryCacheKey(userId));}catch{/* Optional caches. */}if(value){publish(value);setPhase("ready");}else refresh();window.dispatchEvent(new Event("vela:dna-changed"));}
  return {snapshot,phase,refresh,saved};
}
