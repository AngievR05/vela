import {parseHomeSnapshot,parseHomeQueue} from "./home-data.js";

export const HOME_FRESH_MS=30000;

// Restore only this reader's validated data. Browser storage is recovery state,
// never authorization; every later request still verifies the reader server-side.
export function restoreHomeState({rawSnapshot,rawQueue,rawActivity,userId,online,now=Date.now()}) {
  const snapshot=parseHomeSnapshot(rawSnapshot,userId),queue=parseHomeQueue(rawQueue);
  const age=snapshot?now-snapshot.fetchedAt:Infinity;
  let changed=false;
  if(rawActivity)try{const activity=JSON.parse(rawActivity);changed=!Number.isFinite(activity?.at)||activity.at>=snapshot?.fetchedAt;}catch{changed=true;}
  return {snapshot,queue,phase:online?(snapshot?"ready":"loading"):"offline",
    revalidate:Boolean(online&&(!snapshot||changed||queue.length||age<0||age>=HOME_FRESH_MS))};
}
