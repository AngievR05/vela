import { z } from "zod";
import { validIsbn } from "./library-data.js";
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
export const importRowSchema = z.object({row:z.number().int().min(2),title:z.string().trim().min(1).max(300),author:z.string().trim().min(1).max(200),isbn:z.string().refine(value=>!value||validIsbn(value)),status:z.enum(["reading","want_to_read","dnf","finished"]),rating:z.number().int().min(1).max(5).nullable(),pageCount:z.number().int().min(1).max(100000).nullable(),notes:z.string().max(2000),startedAt:date,finishedAt:date,favourite:z.boolean()}).strict().refine(value=>!value.startedAt||!value.finishedAt||value.startedAt<=value.finishedAt,"Finish date must follow the start date.");
export const importBatchSchema=z.object({rows:z.array(importRowSchema).min(1).max(10)}).strict();
export function parseCsv(text) {
  if(new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw new Error("Choose a CSV smaller than 2 MB.");
  text=text.replace(/^\uFEFF/,"");
  const records=[];let record=[],field="",quoted=false,closed=false;
  const push=()=>{record.push(field);field="";closed=false;};
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){if(char==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=char;continue;}
    if(char==='"'){if(field||closed)throw new Error("Malformed CSV: a quote appears inside an unquoted field.");quoted=true;}
    else if(char===",")push();
    else if(char==="\n"||char==="\r"){if(char==="\r"&&text[i+1]==="\n")i++;push();if(record.some(x=>x.trim()))records.push(record);record=[];if(records.length>MAX_IMPORT_ROWS+1)throw new Error("Import up to 2,000 rows at a time.");}
    else if(closed){if(!/\s/.test(char))throw new Error("Malformed CSV: unexpected text after a quoted field.");}
    else field+=char;
  }
  if(quoted)throw new Error("Malformed CSV: a quoted field is not closed.");
  push();if(record.some(x=>x.trim()))records.push(record);
  if(records.length>MAX_IMPORT_ROWS+1)throw new Error("Import up to 2,000 rows at a time.");
  return records;
}
const normalise=value=>value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
const unwrap=value=>value.trim().replace(/^="(.*)"$/, "$1").replace(/^'(\d+)$/, "$1");
function csvDate(value) {
  if(!value.trim())return null;
  const match=value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if(!match)throw new Error("Use dates in YYYY-MM-DD or YYYY/MM/DD format.");
  const result=`${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}`;
  const parsed=new Date(result+"T00:00:00Z");
  if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==result)throw new Error("Invalid calendar date.");
  return result;
}
const statuses={read:"finished",finished:"finished",completed:"finished","currentlyreading":"reading",reading:"reading","toread":"want_to_read",tbr:"want_to_read",wanttoread:"want_to_read","didnotfinish":"dnf",dnf:"dnf"};
export function previewLibraryImport(text) {
  const records=parseCsv(text);if(records.length<2)throw new Error("This CSV has no book rows.");
  const headers=records.shift().map(normalise);
  if(new Set(headers).size!==headers.length)throw new Error("CSV column names must be unique.");
  const find=(row,...names)=>{for(const name of names){const index=headers.indexOf(normalise(name));if(index>=0&&row[index]?.trim())return row[index].trim();}return "";};
  if(!headers.includes("title")||!headers.some(x=>["author","authors"].includes(x)))throw new Error("Include Title and Author columns. Goodreads and StoryGraph exports are supported.");
  const rows=[],issues=[],warnings=[],seen=new Set();
  records.forEach((record,index)=>{const row=index+2;try{
    if(record.length!==headers.length)throw new Error("The number of fields does not match the column headings.");
    const explicitIsbn=find(record,"ISBN13","ISBN");let isbn=unwrap(explicitIsbn||find(record,"ISBN/UID")).replace(/[\s-]/g,"").toUpperCase();
    if(!explicitIsbn&&isbn&&!validIsbn(isbn)){warnings.push({row,message:"StoryGraph UID is not an ISBN; match by title and author instead."});isbn="";}
    const title=find(record,"Title"),author=find(record,"Author","Authors");
    const rawStatus=find(record,"Exclusive Shelf","Read Status","Reading Status","Status");
    const status=rawStatus?statuses[normalise(rawStatus)]:"want_to_read";if(!status)throw new Error(`Unknown reading status: ${rawStatus.slice(0,40)}.`);
    const rawRating=find(record,"My Rating","Star Rating","Rating");let rating=rawRating?Number(rawRating):null;
    if(rating===0)rating=null;if(rating!==null&&(!Number.isFinite(rating)||rating<0||rating>5))throw new Error("Rating must be between 0 and 5.");
    if(rating!==null&&!Number.isInteger(rating)){warnings.push({row,message:"Fractional rating rounded to Vela’s nearest whole star."});rating=Math.max(1,Math.round(rating));}
    const rawPages=find(record,"Number of Pages","Page Count","Pages");const pageCount=rawPages&&Number(rawPages)!==0?Number(rawPages):null;
    const rawNotes=[find(record,"Private Notes","Notes"),find(record,"My Review","Review")].filter(Boolean).join("\n\n");
    const value={row,title,author,isbn,status,rating,pageCount,notes:rawNotes,startedAt:csvDate(find(record,"Date Started","Start Date","Started At")),finishedAt:status==="finished"?csvDate(find(record,"Date Read","Last Date Read","Finish Date","Finished At")):null,favourite:/\bfavou?rites?\b/i.test(find(record,"Bookshelves","Tags"))};
    const parsed=importRowSchema.safeParse(value);if(!parsed.success)throw new Error(parsed.error.issues[0].message);
    const key=isbn||`${normalise(title)}|${normalise(author)}`;if(seen.has(key)){issues.push({row,message:"Duplicate row in this file."});return;}seen.add(key);rows.push(parsed.data);
  }catch(error){issues.push({row,message:error.message});}});
  return {rows,issues,warnings,total:records.length};
}
export function exactImportMatch(row,book) {
  return row.isbn ? book.isbns?.includes(row.isbn) : normalise(row.title)===normalise(book.title)&&book.authors.some(author=>normalise(author)===normalise(row.author));
}
export async function importLibraryRows(supabase, rows, search) {
  const results=[];
  for(const row of rows){
    try{
      let metadata=null;
      try{const books=await search(row.isbn?`isbn:${row.isbn}`:`intitle:${row.title} inauthor:${row.author}`,5);metadata=books.find(book=>exactImportMatch(row,book))||null;}catch{/* CSV books remain importable when catalogue lookup fails. */}
      const {data,error}=await supabase.rpc("import_library_row",{entry:row,metadata});
      if(error)throw new Error("Row save could not be confirmed. Retry this row.");
      results.push({row:row.row,title:row.title,...data});
    }catch{results.push({row:row.row,title:row.title,state:"failed",message:"Could not confirm this row. Retry safely; existing books are preserved."});}
  }
  return results;
}
