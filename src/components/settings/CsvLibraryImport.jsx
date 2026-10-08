"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {previewLibraryImport,MAX_IMPORT_BYTES} from "@/lib/library-import";
import {notifyReadingActivity} from "@/lib/reading-activity-events";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InlineAlert from "@/components/ui/InlineAlert";
import styles from "./Settings.module.css";
const labels={reading:"Reading",want_to_read:"TBR",finished:"Finished",dnf:"DNF"};
export default function CsvLibraryImport({userId}){
  const [preview,setPreview]=useState(null),[name,setName]=useState(""),[error,setError]=useState(""),[results,setResults]=useState([]),[pending,setPending]=useState(false),[done,setDone]=useState(false);
  const running=useRef(false),stop=useRef(false),selection=useRef(0);
  useEffect(()=>()=>{stop.current=true;selection.current++;},[]);
  async function choose(event){const file=event.target.files?.[0];if(!file)return;setError("");setDone(false);setResults([]);setPreview(null);setName(file.name);
    const chosen=++selection.current;
    try{if(!/\.csv$/i.test(file.name))throw new Error("Choose a .csv file.");if(file.size>MAX_IMPORT_BYTES)throw new Error("Choose a CSV smaller than 2 MB.");const parsed=previewLibraryImport(await file.text());if(chosen===selection.current)setPreview(parsed);}catch(error){if(chosen===selection.current)setError(error.message);}}
  async function run(){if(running.current||!preview)return;running.current=true;stop.current=false;setPending(true);setError("");setDone(false);
    const completed=new Set(results.filter(row=>row.state!=="failed").map(row=>row.row));const remaining=preview.rows.filter(row=>!completed.has(row.row));let current=results.filter(row=>row.state!=="failed");
    try{for(let offset=0;offset<remaining.length;offset+=5){if(stop.current)break;const response=await fetch("/api/library/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows:remaining.slice(offset,offset+5)}),signal:AbortSignal.timeout(95000)});
      if(response.status===401){setError("Please log in again. Completed rows are saved; this file remains ready to retry.");break;}
      const body=await response.json();if(!response.ok||!Array.isArray(body.results))throw new Error(body.error||"Import interrupted.");
      current=[...current,...body.results];setResults(current);if(userId&&body.results.some(row=>row.state==="added"))notifyReadingActivity(userId);
    }setDone(!stop.current&&current.filter(row=>row.state!=="failed").length===preview.rows.length);
    }catch{setError("Import interrupted. Completed books are saved. Retry the remaining rows safely.");}
    finally{running.current=false;setPending(false);}}
  const added=results.filter(row=>row.state==="added"),duplicates=results.filter(row=>row.state==="duplicate"),failed=results.filter(row=>row.state==="failed");
  return <>
    <Card className={styles.panel}><h2>Bring your books with you.</h2><p>Upload a Goodreads, StoryGraph or Vela CSV. Preview the rows, then add them to Reading, TBR, DNF and Finished.</p><p className={styles.small}>Up to 2,000 rows · 2 MB. Existing books, ratings, notes and progress stay intact. Imported data follows your current personalisation permissions.</p></Card>
    <label htmlFor="library-csv">Library CSV</label><input className={styles.file} id="library-csv" type="file" accept=".csv,text/csv" onChange={choose} disabled={pending}/>
    <Button variant="tertiary" href="/library-import-template.csv" download>Download CSV template</Button>
    {error&&<InlineAlert type="error">{error}</InlineAlert>}
    {preview&&<><Card className={styles.panel}><h2>{done?"Import complete":"Review your import"}</h2><p>{name} · {preview.rows.length} ready · {preview.issues.length} skipped</p>
      {preview.warnings.length>0&&<p>{preview.warnings.length} import warning(s). Review them below before importing.</p>}
      <p>Books are matched by ISBN, or exact title and author, for Google Books covers. Unmatched books become private manual entries.</p>
      {!results.length&&<table className={styles.table}><thead><tr><th>Book</th><th>Shelf</th><th>Rating</th></tr></thead><tbody>{preview.rows.slice(0,8).map(row=><tr key={row.row}><td>{row.title}<br/><small>{row.author}</small></td><td>{labels[row.status]}</td><td>{row.rating||"—"}</td></tr>)}</tbody></table>}
    </Card>
    {(pending||results.length>0)&&<p role="status">{added.length} added · {duplicates.length} already in Library · {failed.length} need retry{pending?" · Importing…":""}</p>}
    {pending?<Button variant="secondary" onClick={()=>{stop.current=true;setError("Stopping after the current batch. Completed rows stay saved.");}}>Stop after this batch</Button>:!done&&<Button className={styles.primary} disabled={!preview.rows.length} onClick={run}>{results.length?"Retry remaining rows":"Import books"}</Button>}
    {done&&<Button className={styles.primary} href="/library">Open Library</Button>}
    {!!results.length&&<ul className={styles.importList}>{results.filter(row=>row.state==="failed").concat(results.filter(row=>row.state!=="failed").slice(0,8)).map(row=><li key={row.row}>{row.title} · {row.state==="duplicate"?"Already in Library; preserved":row.state==="added"?"Added":"Needs retry"}{row.id&&<> · <Link href={`/library/${row.id}`}>View book</Link></>}</li>)}</ul>}
    {!!preview.issues.length&&<details><summary>Review {preview.issues.length} skipped rows</summary><ul className={styles.importList}>{preview.issues.map(issue=><li key={issue.row}>Row {issue.row}: {issue.message}</li>)}</ul></details>}
    {!!preview.warnings.length&&<details><summary>Review import warnings</summary><ul className={styles.importList}>{preview.warnings.map((warning,index)=><li key={`${warning.row}-${index}`}>Row {warning.row}: {warning.message}</li>)}</ul></details>}
    </>}
  </>;
}
