import { z } from "zod";
import { plainDescription } from "./library-data.js";

const clue = labels => z.object({ label:z.enum(labels), evidence:z.string().min(8).max(500) }).strict();
export const bookCluesSchema = z.object({
  pace:clue(["Slow and immersive","Steady","Fast start","Relentless"]).nullable(),
  moods:z.array(clue(["Reflective","Comforting","Adventurous","Dark","Hopeful","Emotional","Humorous"])).max(4),
  tropes:z.array(clue(["Found family","Slow burn","Enemies to lovers","Friends to lovers","Second chance","Political intrigue","Coming of age","Chosen one","High stakes","Character-led","Quiet reflection"])).max(5),
}).strict();
const normalise = text => plainDescription(text).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
// Provider interpretations must cite this book's description, not private notes or model memory.
export function verifiedBookClues(value, book) {
  const parsed=bookCluesSchema.safeParse(value);
  const description=normalise(book.description||"");
  if(!parsed.success||!description)return {pace:null,moods:[],tropes:[]};
  const verified=entry=>entry&&normalise(entry.evidence).length>=8&&description.includes(normalise(entry.evidence));
  const distinct=entries=>entries.filter(verified).filter((entry,index,array)=>array.findIndex(item=>item.label===entry.label)===index);
  return {pace:verified(parsed.data.pace)?parsed.data.pace:null,moods:distinct(parsed.data.moods),tropes:distinct(parsed.data.tropes)};
}
export function bookGenres(book) {
  const labels=[...new Set((book.categories||[]).flatMap(category=>category.split("/").map(part=>part.trim())))].filter(Boolean);
  const specific=labels.filter(label=>!(["fiction","general"].includes(label.toLowerCase())));
  return (specific.length?specific:labels.filter(label=>label.toLowerCase()!=="general")).slice(0,10);
}
const aliases={"science fiction":["science fiction","sci fi"],"historical":["historical fiction","historical"],"non fiction":["nonfiction","non fiction"],"literary fiction":["literary"],"humour":["humorous"],"comforting":["cosy","cozy","comforting"],"steady":["steady","medium"]};
export function bookFit(book, snapshot, clues={pace:null,moods:[],tropes:[]}) {
  if(!snapshot)return {label:"Your reading fit",text:"Your approved preferences are loading. Book facts are available below.",matches:[]};
  if(!snapshot.personalisationEnabled)return {label:"Personalisation is off",text:"Book information is available. Turn on personalisation in Settings to compare it with your approved Reading DNA.",matches:[]};
  const genres=bookGenres(book).map(normalise);
  const descriptors=[clues.pace?.label,...clues.moods.map(item=>item.label),...clues.tropes.map(item=>item.label)].filter(Boolean).map(normalise);
  const matches=(snapshot.signals||[]).filter(signal=>{
    // DNF and mixed signals do not encode whether a characteristic is liked or disliked.
    if(!["onboarding","manual","correction"].includes(signal.source))return false;
    const label=normalise(signal.label);
    const terms=aliases[label]||[label];
    return terms.some(term=>genres.includes(term)||descriptors.includes(term));
  }).slice(0,4).map(signal=>signal.label);
  return matches.length?{label:"This may be your kind of book",text:`It shares ${matches.join(", ")} with your chosen preferences. This is a starting point, not a promise that you’ll enjoy it.`,matches}
    :{label:"A little more to discover",text:snapshot.signals?.length?"The available book information doesn’t establish a match with your chosen preferences. That doesn’t mean you won’t like it.":"Choose some preferences in Reading DNA to see how this book fits. Your taste is yours to define.",matches:[]};
}
