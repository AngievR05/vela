"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authBody, authDisplay } from "@/components/auth/fonts";
import { BrandLogo } from "@/components/auth/AuthScreen";
import AppHeader from "@/components/layout/AppHeader";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import CurrentlyReadingCard from "@/components/books/CurrentlyReadingCard";
import BookCover from "@/components/books/BookCover";
import BookSearchResultRow from "@/components/books/BookSearchResultRow";
import ReadingFlow from "@/components/reading/ReadingFlow";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SearchField from "@/components/ui/SearchField";
import InlineAlert from "@/components/ui/InlineAlert";
import SkeletonLoader from "@/components/states/SkeletonLoader";
import BottomSheet from "@/components/feedback/BottomSheet";
import ConfirmationDialog from "@/components/feedback/ConfirmationDialog";
import { deriveHome, homeInsight } from "@/lib/home-data";
import { deriveReadingStats } from "@/lib/reading-stats";
import ReadingArtwork from "@/components/stats/ReadingArtwork";
import { CountBars, StatsMetrics } from "@/components/stats/StatsCharts";
import useHome from "./useHome";
import styles from "./Home.module.css";

function greeting(hour) { return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; }
const sourceCopy = { onboarding: "Chosen during reading setup", manual: "Chosen by you", correction: "Corrected by you", rating: "From your permitted ratings", dnf: "From DNF reasons you approved" };
const statusCopy = { reading: "Currently reading", want_to_read: "Saved for later", finished: "Finished", dnf: "Stopped reading" };

export default function HomeScreen({ userId, initialAction }) {
  const router = useRouter();
  const home = useHome(userId);
  const [salutation, setSalutation] = useState("Hello");
  const [modal, setModal] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [discard, setDiscard] = useState(null);
  const busy = useRef(false);
  const searchBusy = useRef(false);
  const close = useCallback(() => { if (!busy.current) setModal(null); }, []);
  useEffect(() => {
    if (["add", "library"].includes(initialAction)) Promise.resolve().then(() => setModal(initialAction));
  }, [initialAction]);
  useEffect(() => {
    Promise.resolve().then(() => setSalutation(greeting(new Date().getHours())));
    const timer = setInterval(() => setSalutation(greeting(new Date().getHours())), 60000);
    return () => clearInterval(timer);
  }, []);

  const summary = home.snapshot ? deriveHome(home.snapshot) : null;
  const insight = home.snapshot ? homeInsight(home.snapshot) : null;
  const yearStats = home.snapshot ? deriveReadingStats(home.snapshot) : null;
  const offline = !home.online || home.phase === "offline";
  const state = home.phase === "loading" ? "loading" : home.phase === "error" ? "error" : offline ? "offline" : summary?.state || "new";
  const tone = { populated: "brass", "no-current": "green", new: "purple", loading: "loading", offline: "offline", error: "error" }[state];
  const name = home.snapshot?.displayName?.trim() || "";
  const title = state === "populated" ? "A little reading magic" : `${state === "new" ? "Welcome" : salutation}${name ? `, ${name}` : ""}`;
  const selectedBook = home.snapshot?.books.find((book) => book.id === selectedId);

  function openAdd() { router.push("/library/add"); }
  function openProgress(book) {
    setSelectedId(book.id); setFormError(""); setModal("progress");
  }
  async function startBook(book) {
    if (busy.current) return;
    busy.current = true; setSaving(true); setFormError("");
    try {
      const result = await home.mutate({ kind: "start", id: book.id });
      setNotice(result.queued ? "Saved on this device. Your reading status will sync when online." : `Started ${book.title}.`);
    } catch (error) { setFormError(error.message); }
    finally { busy.current = false; setSaving(false); }
  }
  async function search(event) {
    event.preventDefault();
    if (searchBusy.current || busy.current) return;
    if (query.trim().length < 2) { setFormError("Enter at least two characters to search."); return; }
    searchBusy.current = true; setSearching(true); setFormError("");
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query.trim())}`, { signal: AbortSignal.timeout(20000) });
      if (response.status === 401) { window.location.replace("/login?next=/home"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "We couldn’t search. Your search is still here; please try again.");
      setResults(body.books); setSearched(true);
    } catch (error) { setFormError(error.name === "TimeoutError" || error instanceof TypeError ? "We couldn’t connect. Your search is still here; please try again." : error.message); }
    finally { searchBusy.current = false; setSearching(false); }
  }
  async function addBook(book) {
    if (busy.current) return;
    busy.current = true; setAddingId(book.googleBooksId); setFormError("");
    try {
      const response = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleBooksId: book.googleBooksId }), signal: AbortSignal.timeout(20000) });
      if (response.status === 401) { window.location.replace("/login?next=/home"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "We couldn’t add this book. Please try again.");
      setNotice(`${book.title} added to your Library.`); setModal(null);
      await home.refreshQuietly();
    } catch (error) { setFormError(error.name === "TimeoutError" || error instanceof TypeError ? "We couldn’t connect. Your search is still here; please try again." : error.message); }
    finally { busy.current = false; setAddingId(null); }
  }

  function navigation(event, href) {
    if (!offline) return;
    if (href === "/home") { event.preventDefault(); return; }
    event.preventDefault();
    if (href === "/library") setModal("library");
    else if (href === "/dna") setModal("evidence");
    else setNotice("Reconnect to open this part of Vela. Saved books are available here.");
  }
  const nextRead = (secondary = false) => <Button href="/discover" variant={secondary ? "secondary" : "primary"}
    className={`${styles.button} ${secondary ? styles.secondary : ""}`}>Find my next read</Button>;
  const readingCard = summary?.current && <CurrentlyReadingCard variant="home" className={styles.current}
    title={summary.current.title} author={summary.current.author} coverSrc={summary.current.coverSrc}
    progress={summary.current.progressPercent}
    detailHref={`/library/${summary.current.id}`}
    progressText={summary.current.pageCount ? `${summary.current.currentPage ?? Math.round(summary.current.pageCount * summary.current.progressPercent / 100)} of ${summary.current.pageCount} pages` : `${summary.current.progressPercent}% complete`}
    onUpdate={() => openProgress(summary.current)} />;
  const insightCard = insight && <Card className={styles.insight}>
    <p>{insight.label}</p><h2>{insight.text}</h2>
    {insight.signals.length ? <button type="button" className={styles.textAction} onClick={() => setModal("evidence")}>{insight.action}</button>
      : offline ? <button type="button" className={styles.textAction} onClick={() => setModal("evidence")}>View saved choices →</button>
        : <Link className={styles.textAction} href={home.snapshot.personalisationEnabled ? "/dna" : "/setup"}>{insight.action}</Link>}
  </Card>;

  return <section className={`${styles.screen} ${styles[tone]} ${authBody.variable} ${authDisplay.variable}`} aria-label="Reading Home">
    <ReadingArtwork home />
    <div className={styles.content}>
      <AppHeader className={styles.header} title={title} subtitle={state === "populated" ? name ? `${name}’s reading home` : "Your reading home" : "YOUR READING HOME"} logo={<BrandLogo size={32} />} />
      {notice && <div className={styles.notice} role="status"><p>{notice}</p><button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
      {home.queue.length > 0 && !offline && <InlineAlert type={home.syncError ? "error" : "info"} className={styles.feedback}>
        {home.syncError || `${home.queue.length} saved ${home.queue.length === 1 ? "update is" : "updates are"} waiting to sync.`}
        <button type="button" className={styles.textAction} onClick={() => setModal("pending")}>Review saved updates →</button>
      </InlineAlert>}
      {state === "loading" && <SkeletonLoader variant="home" className={styles.skeleton} label="Loading your reading Home" />}
      {state === "error" && <>
        <Card className={`${styles.hero} ${styles.errorHero}`} role="alert"><span className={styles.errorMark}>!</span>
          <h2>Home could not refresh.</h2><p>Your Library is safe. Try loading the summary again.</p>
          <Button className={styles.button} onClick={home.refresh}>Retry</Button>
        </Card>
        <Button href="/library" variant="secondary" className={`${styles.button} ${styles.secondary}`}>Open Library instead</Button>
        <Card className={`${styles.support} ${styles.greenSupport}`}><h2>What still works</h2><p>Open your Library, view saved books and update progress while Home refreshes.</p>
          {home.snapshot && <button type="button" className={styles.textAction} onClick={() => setModal("library")}>View saved books →</button>}
        </Card>
      </>}
      {state === "new" && <>
        <Card className={styles.hero}><BrandLogo size={64} /><h2>Your Reading DNA is taking shape.</h2>
          <p>Your Library works now. Reading DNA learns from books only when you approve the relevant sources.</p>
          <Button className={styles.button} onClick={openAdd}>Add your first book</Button>
        </Card>
        <div className={styles.firstSteps}>{["Add a book", "Track progress", "Rate or DNF"].map((label, index) => <div key={label}><strong>{index + 1}</strong><p>{label}</p></div>)}</div>
        <Card className={styles.support}><h2>Build it at your pace</h2><p>Your Library works now. Vela learns only from the reading signals you choose.</p></Card>
        <Card className={`${styles.shelf} ${styles.brassSupport}`}><h2>Your shelf, your pace</h2><p>Your stats will appear as you finish books. Ratings and reflection are always optional.</p><Button className={styles.button} href="/library">Explore my Library</Button></Card>
      </>}
      {state === "populated" && <>
        {readingCard}<Link className={styles.textAction} href="/library/reading">Current reading & finish book →</Link>{nextRead()}
        <StatsMetrics stats={yearStats} home year={new Date().getFullYear()} />
        <section className={styles.activity}><h2>Your year in stories</h2><p>Finished books · January–{new Date().toLocaleDateString("en-GB", { month: "long" })} {new Date().getFullYear()}</p><CountBars items={yearStats.months} compact month onSelect={() => router.push("/stats?view=time")} /><p>{yearStats.total} finished. No streaks, no pressure.</p><Button className={styles.button} href="/stats">Explore my reading stats</Button></section>
        {insightCard}
        <section className={styles.quick}><p>QUICK ACTIONS</p><div>
          <button type="button" onClick={openAdd}><span aria-hidden="true">＋</span><span>Add book</span></button>
          <Link href="/library"><span aria-hidden="true">▥</span><span>Open Library</span></Link>
          <Link href="/dna"><span aria-hidden="true">✦</span><span>View DNA</span></Link>
          <Link href="/stats"><Image src="/reading-stats/stats-icon.svg" width={22} height={22} alt="" unoptimized/><span>Stats</span></Link>
        </div></section>
      </>}
      {state === "no-current" && <>
        <Card className={styles.hero}>
          {summary.saved ? <Link href={`/library/${summary.saved.id}`} aria-label={`Open ${summary.saved.title}`}><BookCover title={summary.saved.title} author={summary.saved.author} src={summary.saved.coverSrc} size="current" className={styles.savedCover} placeholderType="book" decorative /></Link> : <BrandLogo size={64} />}
          <h2>Ready for a new chapter?</h2><p>Start a book from your TBR or browse your Library.</p>
          <Button className={styles.button} href="/library">Browse Library</Button>
        </Card>
        {nextRead(true)}{insightCard}
        {summary.saved ? <Card className={`${styles.support} ${styles.brassSupport}`}><h2>Saved for later</h2>
          <p>{summary.saved.title}{summary.saved.author ? ` · ${summary.saved.author}` : ""} is ready when you want to begin.</p>
          <button type="button" className={styles.textAction} onClick={() => startBook(summary.saved)} disabled={saving}>{saving ? "Starting…" : "Start reading →"}</button>
        </Card> : <Button className={styles.button} variant="tertiary" onClick={openAdd}>Add a book</Button>}
      </>}
      {state === "offline" && <>
        <div className={styles.offlineBanner} role="status"><span aria-hidden="true">↯</span><p>{home.snapshot ? "You’re offline. Saved books and progress remain available." : "You’re offline. Load Home once while online to keep a copy here."}</p></div>
        {readingCard}
        <Button variant="secondary" className={`${styles.button} ${styles.secondary}`} onClick={() => setModal("library")} disabled={!home.snapshot}>Browse saved Library</Button>
        {insightCard}
        <Card className={`${styles.support} ${styles.brassSupport}`}><h2>Changes stay on this device</h2><p>Progress updates will sync automatically when you are back online.</p>
          {home.queue.length > 0 && <button type="button" className={styles.textAction} onClick={() => setModal("pending")}>Review {home.queue.length} saved {home.queue.length === 1 ? "update" : "updates"} →</button>}
        </Card>
      </>}
      {["populated", "no-current", "offline"].includes(state) && home.snapshot && <Card className={styles.shelf}>
        <h2>{offline ? "From your saved Library" : "A story waiting on your shelf"}</h2>
        {home.snapshot.books.filter(book => !book.isRemoved && book.status === "want_to_read").slice(0, 2).map(book => <Link className={styles.shelfBook} key={book.id} href={`/library/${book.id}`}><BookCover src={book.coverSrc} title={book.title} author={book.author} size="search" decorative/><span>{book.title} · {book.author}</span></Link>)}
        <p>{offline ? "Cached books remain available while offline." : "Choose from your TBR whenever you feel ready."}</p>
        {offline ? <Button className={styles.button} onClick={() => setModal("library")}>Browse my TBR</Button> : <Button className={styles.button} href="/library?tab=want_to_read">Browse my TBR</Button>}
      </Card>}
      {formError && modal === null && <InlineAlert type="error" className={styles.feedback}>{formError}</InlineAlert>}
    </div>
    <BottomNavigation variant="home" activePath="/home" onNavigate={navigation} assetDirectory="reading-stats" />

    {modal==="progress"&&selectedBook&&<ReadingFlow key={selectedBook.id} book={selectedBook} mode="progress" home={home} onClose={close}/>}
    <BottomSheet open={modal === "add"} title="Add a book" onClose={close}>
      <form className={styles.form} onSubmit={search}>
        <SearchField label="Find a book" value={query} onChange={(event) => { setQuery(event.target.value); setFormError(""); }} maxLength={200} disabled={searching || Boolean(addingId)} />
        <Button type="submit" className={styles.button} loading={searching} disabled={!home.online || Boolean(addingId)}>{searching ? "Searching…" : "Search books"}</Button>
      </form>
      {formError && <InlineAlert type="error" className={styles.feedback}>{formError}</InlineAlert>}
      {searched && !results.length && <p className={styles.small}>No books found. Try another title or author.</p>}
      <div className={styles.searchResults}>{results.map((book) => <BookSearchResultRow key={book.googleBooksId} title={book.title} author={book.authors.join(", ")}
        coverSrc={book.thumbnailUrl} metadata={book.pageCount ? `${book.pageCount} pages` : null}
        alreadyAdded={home.snapshot?.books.some((item) => item.googleBooksId === book.googleBooksId)}
        onAdd={() => addBook(book)} adding={addingId === book.googleBooksId} />)}</div>
    </BottomSheet>
    <BottomSheet open={modal === "library"} title="Saved Library" onClose={close}>
      <div className={styles.libraryList}>{home.snapshot?.books.map((book) => <Card key={book.id} className={styles.libraryRow}>
        <BookCover title={book.title} author={book.author} src={book.coverSrc} size="search" placeholderType="book" decorative />
        <div><h3>{book.title}</h3><p>{book.author}</p><p>{statusCopy[book.status]}{book.status === "reading" ? ` · ${book.progressPercent}%` : ""}</p>
          {book.status === "reading" && <Button variant="tertiary" onClick={() => openProgress(book)}>Update progress</Button>}
          {book.status === "want_to_read" && <Button variant="tertiary" disabled={saving} onClick={() => startBook(book)}>Start reading</Button>}
        </div>
      </Card>)}</div>
      {!home.snapshot?.books.length && <p>No saved books yet.</p>}
      {formError && <InlineAlert type="error">{formError}</InlineAlert>}
    </BottomSheet>
    <BottomSheet open={modal === "evidence"} title="Your reading evidence" onClose={close}>
      <div className={styles.evidence}>{home.snapshot?.signals.map((signal) => <Card key={signal.id}>
        <h3>{signal.label}</h3><p>{sourceCopy[signal.source] || "Saved reading signal"}</p>
        {signal.evidence.map((book) => <p key={book.id}>{book.title}</p>)}
      </Card>)}</div>
      {!home.snapshot?.signals.length && <p>{home.snapshot?.personalisationEnabled ? "There is no permitted reading evidence yet. You can add taste choices from Settings." : "Personalisation is off. Your saved books remain available."}</p>}
      {!offline && <Button href="/dna" variant="tertiary" className={styles.button}>View Reading DNA</Button>}
    </BottomSheet>
    <BottomSheet open={modal === "pending" && !discard} title="Saved updates" onClose={close}>
      {home.syncError && <InlineAlert type="error">{home.syncError}</InlineAlert>}
      {formError && <InlineAlert type="error">{formError}</InlineAlert>}
      <div className={styles.evidence}>{home.queue.map((mutation) => <Card key={`${mutation.kind}:${mutation.id}`}>
        <h3>{home.snapshot?.books.find((book) => book.id === mutation.id)?.title || "Saved book"}</h3>
        <p>{mutation.kind === "progress" ? `Saved progress: ${mutation.percent}%` : "Start reading"}</p>
        <Button variant="tertiary" onClick={() => setDiscard(mutation)}>Remove saved update</Button>
      </Card>)}</div>
      {!home.queue.length && <p>All your updates have synced.</p>}
      <Button className={styles.button} onClick={home.refresh} disabled={offline}>Retry sync</Button>
    </BottomSheet>
    <ConfirmationDialog open={Boolean(discard)} title="Remove this saved update?" description="The unsynced change will be removed from this device. Your saved Library won’t be deleted."
      confirmLabel="Remove update" onCancel={() => setDiscard(null)} onConfirm={() => {
        try { home.removePending(discard); setDiscard(null); } catch (error) { setDiscard(null); setFormError(error.message); }
      }} />
  </section>;
}
