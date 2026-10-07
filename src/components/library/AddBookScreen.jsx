"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LibraryShell from "./LibraryShell";
import useHome from "@/components/home/useHome";
import BookCover from "@/components/books/BookCover";
import Button from "@/components/ui/Button";
import SearchField from "@/components/ui/SearchField";
import TextField from "@/components/ui/TextField";
import Card from "@/components/ui/Card";
import InlineAlert from "@/components/ui/InlineAlert";
import SkeletonLoader from "@/components/states/SkeletonLoader";
import { manualBookSchema, plainDescription } from "@/lib/library-data";
import { libraryBookSchema } from "@/lib/home-data";
import { createEntryId } from "@/lib/browser-id";
import styles from "./Library.module.css";
export default function AddBookScreen({ userId }) {
  const home = useHome(userId);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [stage, setStage] = useState("search");
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(null);
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState({ title:"", author:"", isbn:"", pages:"" });
  const [entryId, setEntryId] = useState(null);
  const [fields, setFields] = useState({});
  const busy = useRef(false);
  const searchVersion = useRef(0);
  const runSearch = useCallback(async (term, signal) => {
    const version = ++searchVersion.current;
    if (term.trim().length < 2) { setPhase("idle"); setResults([]); return; }
    setPhase("loading"); setError("");
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(term.trim())}`, { signal });
      if (response.status === 401) { window.location.replace("/login?next=/library/add"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Book search is temporarily unavailable.");
      if (version !== searchVersion.current) return;
      setResults(body.books); setPhase("ready");
    } catch (failure) {
      if (version !== searchVersion.current || signal?.reason?.name === "AbortError") return;
      setPhase("error"); setError("We couldn’t load book results. Check your connection and try again.");
    }
  }, []);
  useEffect(() => {
    if (stage !== "search") return;
    const controller = new AbortController();
    const timer = setTimeout(() => runSearch(query, AbortSignal.any([controller.signal, AbortSignal.timeout(20000)])), 400);
    return () => { clearTimeout(timer); controller.abort(); searchVersion.current += 1; };
  }, [query, stage, runSearch]);
  const existing = selected && home.snapshot?.books.find(book=>!book.isRemoved && book.googleBooksId === selected.googleBooksId);
  function selectBook(book) { setSelected(book); setStage("preview"); setError(""); }
  function beginManual() { setStage("manual"); setError(""); if (!entryId) setEntryId(createEntryId()); }
  function editManual(field, value) { setManual({...manual,[field]:value}); setFields({}); setError(""); setEntryId(createEntryId()); }
  async function save(status) {
    if (busy.current || !selected) return;
    busy.current = true; setSaving(true); setError("");
    try {
      const response = await fetch("/api/library", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({googleBooksId:selected.googleBooksId,status}), signal:AbortSignal.timeout(20000) });
      if (response.status === 401) { window.location.replace("/login?next=/library/add"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "We couldn’t save this book. Please try again.");
      const parsed = libraryBookSchema.safeParse(body.book);
      if (!parsed.success) throw new Error("We couldn’t confirm the saved book. Please try again.");
      setSaved(parsed.data); setDuplicate(Boolean(body.duplicate)); setStage("success"); home.refreshQuietly();
    } catch (failure) { setError(failure.name === "TimeoutError" || failure instanceof TypeError ? "We couldn’t connect. Your book selection is still here; please try again." : failure.message); }
    finally { busy.current = false; setSaving(false); }
  }
  async function saveManual(event) {
    event.preventDefault(); if (busy.current) return;
    const parsed = manualBookSchema.safeParse({entryId,title:manual.title,author:manual.author,isbn:manual.isbn,pageCount:manual.pages.trim()?Number(manual.pages):null});
    if (!parsed.success) { setFields(parsed.error.flatten().fieldErrors); setError("Check your entry. Your input is still here."); return; }
    busy.current=true;setSaving(true);setError("");setFields({});
    try {
      const response=await fetch("/api/library/manual",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data),signal:AbortSignal.timeout(30000)});
      if(response.status===401){window.location.replace("/login?next=/library/add");return;}
      const body=await response.json();
      if(!response.ok){setFields(body.fields||{});throw new Error(body.error||"We couldn’t save this book. Please try again.");}
      const book=libraryBookSchema.safeParse(body.book);if(!book.success)throw new Error("We couldn’t confirm the saved book. Please try again.");
      setSaved(book.data);setDuplicate(false);setStage("success");home.refreshQuietly();
    }catch(failure){setError(failure.name==="TimeoutError"||failure instanceof TypeError?"We couldn’t connect. Your entry is still here; please try again.":failure.message);}
    finally{busy.current=false;setSaving(false);}
  }
  const title=stage==="manual"?"Manual entry":stage==="preview"?"Book preview":"Add a book";
  const subtitle=stage==="manual"?"Title and author are required":stage==="preview"?"Check before adding":stage==="success"?duplicate?"Already on your shelf":"Saved to your Library":phase==="loading"?"Searching books…":phase==="ready"?`${results.length} books found`:"Search your next read";
  const code=stage==="manual"?"E05":stage==="preview"?existing?"E09":"E06":stage==="success"?duplicate?"E09":saved?.status==="reading"?"E08":"E07":phase==="loading"?"E02":phase==="error"?"E10":phase==="ready"?results.length?"E03":"E04":"E01";
  return <LibraryShell kind="add" title={title} subtitle={subtitle} code={code} back="/library" onBack={stage!=="search"&&stage!=="success"?()=>{if(!busy.current){setStage("search");setError("");}}:undefined}>
    {stage==="search"&&<>
      <form onSubmit={event=>{event.preventDefault();runSearch(query,AbortSignal.timeout(20000));}}><SearchField label="Search title, author or ISBN" value={query} maxLength={200} onChange={event=>setQuery(event.target.value)} className={styles.search} /></form>
      {phase==="idle"&&<><Card className={styles.discovery}><h2>A door to your<br/>next world.</h2><p>Search by title, author or ISBN, then save it to a shelf.</p><span>TITLE · AUTHOR · ISBN</span></Card><Button variant="tertiary" onClick={beginManual}>Add manually</Button></>}
      {phase==="loading"&&<SkeletonLoader variant="library" label="Searching books" />}
      {phase==="ready"&&results.length>0&&<div className={styles.results}>{results.map(book=><button type="button" key={book.googleBooksId} className={styles.result} onClick={()=>selectBook(book)} aria-label={`Preview ${book.title} by ${book.authors.join(", ")}`}>
        <BookCover title={book.title} author={book.authors.join(", ")} src={book.thumbnailUrl} size="search" decorative />
        <span><strong>{book.title}</strong><span>{book.authors.join(", ")||"Author unavailable"}</span><small>{[book.categories[0],book.publishedDate?.slice(0,4),book.pageCount?`${book.pageCount} pages`:null].filter(Boolean).join(" · ")}</small></span><span aria-hidden="true">›</span>
      </button>)}</div>}
      {phase==="ready"&&!results.length&&<Card className={styles.empty}><h2>No book found</h2><p>Try a shorter title or add the book manually.</p><Button onClick={beginManual}>Add manually</Button></Card>}
      {phase==="error"&&<Card className={styles.empty}><h2>Connection lost</h2><p>{error}</p><Button onClick={()=>runSearch(query,AbortSignal.timeout(20000))}>Retry</Button><Button variant="secondary" onClick={beginManual}>Add manually</Button></Card>}
    </>}
    {stage==="preview"&&selected&&<><Card className={styles.preview}><BookCover title={selected.title} author={selected.authors.join(", ")} src={selected.thumbnailUrl} size="detail" className={styles.detailCover} placeholderType="book" decorative />
      <div><h2>{selected.title}</h2><p>{selected.authors.join(", ")}</p><p>{[selected.categories[0],selected.publishedDate?.slice(0,4)].filter(Boolean).join(" · ")}</p>{selected.pageCount>0&&<p>{selected.pageCount} pages</p>}<small>Book facts · Google Books</small></div>
    </Card>{selected.description&&<p className={styles.description}>{plainDescription(selected.description).slice(0,600)}</p>}
      {existing?<Card className={styles.empty}><h2>Already on your shelf.</h2><p>{existing.title} · {existing.status.replaceAll("_"," ")} · {existing.progressPercent}%</p><Button href={`/library/${existing.id}`}>View existing book</Button></Card>:<><Button className={styles.fullButton} loading={saving} onClick={()=>save("want_to_read")} disabled={!home.online}>Save to TBR</Button><Button className={styles.fullButton} variant="secondary" disabled={saving||!home.online} onClick={()=>save("reading")}>Start reading</Button></>}
    </>}
    {stage==="manual"&&<form className={styles.form} onSubmit={saveManual} noValidate>
      <TextField label="Title" value={manual.title} onChange={event=>editManual("title",event.target.value)} error={fields.title?.[0]} maxLength={300} disabled={saving}/>
      <TextField label="Author" value={manual.author} onChange={event=>editManual("author",event.target.value)} error={fields.author?.[0]} maxLength={200} disabled={saving}/>
      <TextField label="ISBN (optional)" value={manual.isbn} onChange={event=>editManual("isbn",event.target.value)} error={fields.isbn?.[0]} maxLength={24} disabled={saving}/>
      <TextField label="Total pages (optional)" type="number" min={1} max={100000} step={1} value={manual.pages} onChange={event=>editManual("pages",event.target.value)} error={fields.pageCount?.[0]} disabled={saving}/>
      <Button type="submit" className={styles.fullButton} loading={saving}>Add book</Button>
    </form>}
    {error&&stage!=="search"&&<InlineAlert type="error">{error}</InlineAlert>}
    {stage==="success"&&saved&&<><Card className={styles.success}><Link href={`/library/${saved.id}`} aria-label={`Open ${saved.title}`}><BookCover title={saved.title} author={saved.author} src={saved.coverSrc} size="detail" className={styles.detailCover} placeholderType="book" decorative/></Link><h2>{duplicate?"Already on your shelf.":saved.status==="reading"?"Now reading.":"Added to your Library."}</h2><p>{saved.title}</p></Card>
      <Button className={styles.fullButton} href={`/library/${saved.id}`}>View book detail</Button><Button className={styles.fullButton} variant="secondary" href={`/library?tab=${saved.status}`}>View {saved.status==="want_to_read"?"TBR":saved.status.replaceAll("_"," ")} shelf</Button><Button variant="tertiary" onClick={()=>{setStage("search");setQuery("");setResults([]);setPhase("idle");setSelected(null);setManual({title:"",author:"",isbn:"",pages:""});setEntryId(null);}}>Add another book</Button>
    </>}
  </LibraryShell>;
}
