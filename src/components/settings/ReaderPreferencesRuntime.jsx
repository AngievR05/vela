"use client";
import {useEffect} from "react";
import {defaultReaderPreferences,readerNotificationChoices,readerPreferenceUpdate,readerPreferencesResponse,settingsCacheKey} from "@/lib/reader-settings";
export function publishReaderPreferences(userId,preferences){try{localStorage.setItem(settingsCacheKey(userId),JSON.stringify(preferences));}catch{/* Online preferences remain saved. */}window.dispatchEvent(new CustomEvent("vela:preferences",{detail:{userId,preferences}}));}
export default function ReaderPreferencesRuntime({userId,initial}){
  useEffect(()=>{
    let preferences=initial||defaultReaderPreferences,revision=0,active=true;
    const controller=new AbortController();
    const root=document.documentElement,dark=window.matchMedia("(prefers-color-scheme: dark)");
    if(!initial)try{preferences=readerPreferenceUpdate(userId,{type:"storage",key:settingsCacheKey(userId),newValue:localStorage.getItem(settingsCacheKey(userId))})||preferences;}catch{/* Defaults remain usable if storage is blocked. */}
    const logKey=`vela:notifications:v1:${userId}`;
    function apply(){root.dataset.velaTheme=preferences.theme==="system"?(dark.matches?"dark":"light"):preferences.theme;root.dataset.velaMotion=preferences.reduceMotion?"reduce":"system";root.dataset.velaContrast=preferences.highContrast?"high":"standard";root.dataset.velaDensity=preferences.density;root.dataset.velaText=preferences.textScale;}
    function update(event){const next=readerPreferenceUpdate(userId,event);if(next){revision++;preferences=next;apply();}}
    function notify(){if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
      const now=new Date(),day=[now.getFullYear(),now.getMonth()+1,now.getDate()].join("-");let log={};try{log=JSON.parse(localStorage.getItem(logKey))||{};}catch{return;}
      const choices=readerNotificationChoices(preferences,now);
      for(const choice of choices){if(!choice.enabled||log[choice.key]===day)continue;log[choice.key]=day;try{localStorage.setItem(logKey,JSON.stringify(log));new Notification("Vela",{body:choice.text,tag:`vela-${userId}-${choice.key}`});}catch{/* A denied browser permission never blocks reading. */}}
    }
    apply();dark.addEventListener("change",apply);window.addEventListener("vela:preferences",update);window.addEventListener("storage",update);const timer=setInterval(notify,30000);
    if(!initial)fetch("/api/settings",{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async response=>{
      if(!response.ok)return;
      const next=readerPreferencesResponse(userId,await response.json());
      // A slow startup response must not undo a newer preference edit in any tab.
      if(active&&revision===0&&next){preferences=next;apply();try{localStorage.setItem(settingsCacheKey(userId),JSON.stringify(next));}catch{/* Storage is optional. */}}
    }).catch(()=>{/* Appearance refresh never blocks the reader's page. */});
    return()=>{active=false;controller.abort();clearInterval(timer);dark.removeEventListener("change",apply);window.removeEventListener("vela:preferences",update);window.removeEventListener("storage",update);for(const key of ["velaTheme","velaMotion","velaContrast","velaDensity","velaText"])delete root.dataset[key];};
  },[userId,initial]);
  return null;
}
