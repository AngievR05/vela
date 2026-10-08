"use client";
import {useEffect} from "react";
import {defaultReaderPreferences,readerNotificationChoices,readerPreferencesSchema,settingsCacheKey} from "@/lib/reader-settings";
export function publishReaderPreferences(userId,preferences){try{localStorage.setItem(settingsCacheKey(userId),JSON.stringify(preferences));}catch{/* Online preferences remain saved. */}window.dispatchEvent(new CustomEvent("vela:preferences",{detail:{userId,preferences}}));}
export default function ReaderPreferencesRuntime({userId,initial=defaultReaderPreferences}){
  useEffect(()=>{
    let preferences=initial;const root=document.documentElement,dark=window.matchMedia("(prefers-color-scheme: dark)");
    const logKey=`vela:notifications:v1:${userId}`;
    function apply(){root.dataset.velaTheme=preferences.theme==="system"?(dark.matches?"dark":"light"):preferences.theme;root.dataset.velaMotion=preferences.reduceMotion?"reduce":"system";root.dataset.velaContrast=preferences.highContrast?"high":"standard";root.dataset.velaDensity=preferences.density;root.dataset.velaText=preferences.textScale;}
    function update(event){if(event.detail?.userId!==userId)return;const parsed=readerPreferencesSchema.safeParse(event.detail.preferences);if(parsed.success){preferences=parsed.data;apply();}}
    function notify(){if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
      const now=new Date(),day=[now.getFullYear(),now.getMonth()+1,now.getDate()].join("-");let log={};try{log=JSON.parse(localStorage.getItem(logKey))||{};}catch{return;}
      const choices=readerNotificationChoices(preferences,now);
      for(const choice of choices){if(!choice.enabled||log[choice.key]===day)continue;log[choice.key]=day;try{localStorage.setItem(logKey,JSON.stringify(log));new Notification("Vela",{body:choice.text,tag:`vela-${userId}-${choice.key}`});}catch{/* A denied browser permission never blocks reading. */}}
    }
    apply();dark.addEventListener("change",apply);window.addEventListener("vela:preferences",update);const timer=setInterval(notify,30000);
    return()=>{clearInterval(timer);dark.removeEventListener("change",apply);window.removeEventListener("vela:preferences",update);for(const key of ["velaTheme","velaMotion","velaContrast","velaDensity","velaText"])delete root.dataset[key];};
  },[userId,initial]);
  return null;
}
