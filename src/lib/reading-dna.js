import { z } from "zod";
export const dnaCacheKey = userId => `vela:dna:v1:${userId}`;
export const dnaMutationSchema = z.discriminatedUnion("action", [
  z.object({ action:z.enum(["keep","reduce","remove"]), operationId:z.uuid(), signalId:z.uuid(), expectedUpdatedAt:z.iso.datetime({offset:true}) }).strict(),
  z.object({ action:z.literal("undo"), operationId:z.uuid(), changeId:z.uuid() }).strict(),
  z.object({ action:z.literal("reset"), operationId:z.uuid(), confirmation:z.literal("RESET") }).strict(),
]);
export const dnaSnapshotSchema = z.object({userId:z.uuid(), fetchedAt:z.number(), enabled:z.boolean(), completed:z.boolean(), resetAt:z.string().nullable(), undoable:z.object({id:z.uuid(),signalId:z.uuid(),action:z.string()}).nullable().default(null), signals:z.array(z.object({
  id:z.uuid(), label:z.string(), category:z.string(), source:z.string(), updatedAt:z.string(), active:z.boolean(), storedActive:z.boolean(), strength:z.enum(["strong","emerging","off"]), influence:z.enum(["normal","reduced","stopped"]), reason:z.string(), summary:z.string(), description:z.string(),
  evidence:z.array(z.object({id:z.string(), title:z.string(), context:z.string(), bookId:z.uuid().nullable()})),
}))});
export function parseDNASnapshot(raw, userId) {
  try { const result=dnaSnapshotSchema.safeParse(JSON.parse(raw));return result.success&&result.data.userId===userId?result.data:null; } catch { return null; }
}
const sources={onboarding:"Chosen reading preference",manual:"Explicit reading preference",rating:"Approved rating activity",history:"Approved completed reading",dnf:"Approved did-not-finish reason",correction:"Saved correction",mixed:"Mixed evidence"};
// Evidence is resolved against this reader's Library. Unknown consent is never inferred.
export function describeDNASignals(rows, books, settings, resetAt = null) {
  return rows.filter(row=>!resetAt||["onboarding","manual"].includes(row.source_type)||Date.parse(row.created_at)>Date.parse(resetAt)).map(row=>{
    const explicit=["onboarding","manual"].includes(row.source_type);
    const permitted=explicit||row.source_type==="correction"||(row.source_type==="rating"&&settings.use_recent_ratings)||(row.source_type==="history"&&settings.use_recent_history)||(row.source_type==="dnf"&&settings.use_dnf_reasons);
    const entries=Array.isArray(row.evidence)?row.evidence:[row.evidence];
    const evidence=[];
    if(explicit)evidence.push({id:`choice:${row.id}`,title:sources[row.source_type],context:`${row.category.replaceAll("_"," ")} · ${row.label} · Chosen by you`,bookId:null});
    if(permitted&&!explicit)for(const entry of entries){
      const key=typeof entry==="string"?entry:entry?.user_book_id||entry?.book_id||entry?.bookId||entry?.id;
      const book=books.find(book=>!book.isRemoved&&(book.id===key||book.bookId===key));
      if(!book||evidence.some(item=>item.bookId===book.id))continue;
      if(resetAt&&(!entry?.occurred_at||!(Date.parse(entry.occurred_at)>Date.parse(resetAt))))continue;
      if(row.source_type==="rating"&&(book.rating==null||(entry?.rating!=null&&entry.rating!==book.rating)))continue;
      if(row.source_type==="history"&&book.status!=="finished")continue;
      if(row.source_type==="dnf"&&(book.status!=="dnf"||!book.dnfUse))continue;
      // Legacy corrections have no per-activity source map; show the explicit correction, not guessed evidence.
      if(row.source_type==="correction")continue;
      evidence.push({id:`book:${book.id}`,bookId:book.id,title:sources[row.source_type],context:`${book.title}${row.source_type==="rating"?` · ${book.rating} stars`:row.source_type==="dnf"?` · ${book.dnfReason||"Stopped reading"}`:""} · Use approved by you`});
    }
    if(row.source_type==="correction")evidence.push({id:`correction:${row.id}`,bookId:null,title:"Explicit correction",context:"A saved reading preference correction. No book-level provenance was recorded."});
    const reason=!settings.personalisation_enabled?"Personalisation is off":!permitted?"Permission or evidence provenance not available":!row.active?"Stopped or no longer selected":!evidence.length?"No current approved evidence":"";
    const active=!reason&&Number(row.internal_weight)>0;
    const influence=row.influence_state||(row.active?"normal":"stopped");
    const strength=!active?"off":evidence.length>=3&&!explicit?"strong":"emerging";
    const summary=!active?`Not used · ${reason||"Zero influence"}`:influence==="reduced"?"Reduced influence · Approved evidence":explicit?"Emerging · Chosen by you":`${strength==="strong"?"Strong":"Emerging"} · ${evidence.length} approved ${evidence.length===1?"activity":"activities"}`;
    return {id:row.id,label:row.label,category:row.category,source:row.source_type,updatedAt:row.updated_at,active,storedActive:row.active,strength,influence,reason,summary,evidence,
      description:explicit?"This preference was chosen by you. It is a starting point, not an inferred fact about your taste.":row.source_type==="rating"?"A saved signal linked to ratings you allowed. A rating alone does not explain why you liked a book.":row.source_type==="dnf"?"A saved signal linked to did-not-finish reasons you allowed. You can change its influence at any time.":row.source_type==="history"?"A pattern in books you finished with reading-history learning enabled. Finishing a book does not prove you enjoyed it.":"A provisional saved reading signal. Review the recorded source before deciding how Vela should use it."};
  });
}
