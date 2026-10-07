"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/auth/AuthScreen";
import { authBody, authDisplay } from "@/components/auth/fonts";
import useHome from "@/components/home/useHome";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import Button from "@/components/ui/Button";
import InlineAlert from "@/components/ui/InlineAlert";
import BottomSheet from "@/components/feedback/BottomSheet";
import BookCover from "@/components/books/BookCover";
import { deriveReadingStats, booksForStats, statsCacheKey, primaryGenre, bookMoods, readingFormats, storyPaces, saveStatsRecordSchema } from "@/lib/reading-stats";
import { localDate } from "@/lib/home-data";
import ReadingArtwork from "./ReadingArtwork";
import { CountBars, CountDonut, StatsMetrics } from "./StatsCharts";
import styles from "./ReadingStats.module.css";

const views = ["overview", "time", "genres", "pace", "ratings", "books"];
export default function ReadingStatsScreen({ userId, initialView, initialBook }) {
  const home = useHome(userId, { endpoint: "/api/stats", cacheKey: statsCacheKey(userId), returnPath: "/stats" });
  const [view, setView] = useState(initialBook ? "books" : views.includes(initialView) ? initialView : "overview");
  const [period, setPeriod] = useState(String(new Date().getFullYear()));
  const [filter, setFilter] = useState(initialBook ? { type: "book", value: initialBook, label: "Reading record" } : null);
  const [previousView, setPreviousView] = useState("overview");
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const stats = home.snapshot ? deriveReadingStats(home.snapshot, period) : null;
  const offline = !home.online || home.phase === "offline";
  const periodLabel = period === "all" ? "All time" : period;
  const books = stats ? booksForStats(stats, filter) : [];
  function openBooks(type, value, label = value) {
    setPreviousView(view); setFilter(type ? { type, value, label } : null); setView("books");
    window.scrollTo({ top: 0 });
  }
  function choosePeriod(next) { setPeriod(String(next)); setFilter(null); setView(previousView === "books" ? "overview" : previousView); }
  function periods() { setPreviousView(view); setView("period"); }
  function edit(book) {
    setError(""); setRecord({ id: book.id, title: book.title, finishedAt: book.finishedAt || "", format: book.format || "", primaryGenre: book.primaryGenre || "", moods: book.moods || [], pace: book.pace || "", expectedUpdatedAt: book.updatedAt });
  }
  async function save(event) {
    event.preventDefault();
    if (busy.current) return;
    const { id, title: _title, ...fields } = record;
    const data = { ...fields, finishedAt: fields.finishedAt || null, format: fields.format || null, pace: fields.pace || null };
    const parsed = saveStatsRecordSchema.safeParse(data);
    if (!parsed.success || data.finishedAt > localDate()) { setError("Check the finish date and reading details. Your input is still here."); return; }
    busy.current = true; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/stats/books/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(20000) });
      if (response.status === 401) { window.location.replace("/login?next=/stats"); return; }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.saved) throw new Error(result.error || "We couldn’t confirm your saved record. Please try again.");
      setRecord(null); setNotice("Reading record saved."); await home.refreshQuietly();
    } catch (err) { setError(err.name === "TimeoutError" || err instanceof TypeError ? "We couldn’t connect. Your input is still here; please try again." : err.message); }
    finally { busy.current = false; setSaving(false); }
  }
  const chart = (title, items, type, copy, target, donut = false) => <section className={styles.card} key={title}>
    <h2>{title}</h2>
    {donut ? <CountDonut items={items} total={stats.total} onSelect={item => openBooks(type, item.key)}/> : <CountBars items={items} onSelect={item => openBooks(type, item.key)}/>}
    <p className={styles.muted}>{copy}</p>
    {target && <button className={styles.chartAction} onClick={() => { setView(target); window.scrollTo({ top: 0 }); }}>Explore {title.toLowerCase()} ›</button>}
  </section>;
  const formatChart = () => chart("Reading formats", stats.formats, "format", "Formats you recorded for finished books.", view === "overview" ? "time" : null, true);
  const genreChart = () => chart("Primary genres", stats.genres, "genre", "One primary genre per finished book. Google Books categories are used until you choose one.", view === "overview" ? "genres" : null, true);
  const moodChart = () => chart("Book moods", stats.moods, "mood", stats.moods.some(item => item.count) ? `A book can have several moods; totals may exceed ${stats.total}.` : "No book moods recorded yet. Add them to your finished books.", view === "overview" ? "genres" : null);
  const paceChart = () => chart("Story pace", stats.paces, "pace", "Story pace describes the book, not your reading speed.", view === "overview" ? "pace" : null);
  const lengthChart = () => chart("Book length", stats.lengths, "length", `Pages in each finished edition · ${stats.knownPages} of ${stats.total} page counts recorded.`, view === "overview" ? "pace" : null);
  const ratingsChart = () => chart("Your ratings", stats.ratings, "rating", `${stats.rated} rated books · ${stats.unrated} unrated. Average: ${stats.average} / 5.`, view === "overview" ? "ratings" : null);
  const timeChart = () => <section className={styles.card}><h2>{period === "all" ? "Finished books by year" : "Finished books by month"}</h2>
    <CountBars items={stats.months} month onSelect={item => openBooks("month", item.key, item.label)}/>
    {view === "time" && <div className={styles.monthLinks}>{stats.months.map(item => <button key={item.key} onClick={() => openBooks("month", item.key, item.label)}>{item.label}</button>)}</div>}
    <p>{stats.total} finishes · {periodLabel}</p>{view === "overview" && <button className={styles.chartAction} onClick={() => setView("time")}>Explore reading over time ›</button>}
  </section>;

  return <section className={`${styles.screen} ${authBody.variable} ${authDisplay.variable}`} aria-label="Reading stats">
    <ReadingArtwork/>
    <div className={styles.content}>
      <header className={styles.header}>
        {view === "overview" ? <Link className={styles.back} href="/home" aria-label="Back to Home">‹</Link> : <button className={styles.back} onClick={() => { setView(view === "period" || view === "books" ? previousView : "overview"); setFilter(null); }} aria-label="Back to stats">‹</button>}
        <h1>Reading stats</h1><BrandLogo size={28}/>
      </header>
      <p className={styles.subtitle}>{offline ? "Offline · Last saved stats" : home.phase === "error" ? "Your Library is safe" : "A look at your reading history"}</p>
      {notice && <p role="status">{notice}</p>}
      {home.phase === "loading" ? <><h2 className={styles.sectionTitle} role="status">Loading your reading stats…</h2>{[1, 2, 3].map(i => <div className={styles.skeleton} key={i} aria-hidden="true"/>)}</>
      : home.phase === "error" ? <><h2 className={styles.sectionTitle}>Stats could not load</h2><p className={styles.copy}>Your books and reading history are safe. Check your connection and try again.</p><Button className={styles.button} onClick={home.refresh}>Try again</Button><Button className={styles.button} variant="secondary" href="/library">Open my Library</Button></>
      : !stats ? <><h2 className={styles.sectionTitle}>No saved reading stats yet</h2><p>Connect once to save a reading summary on this device.</p><Button className={styles.button} onClick={home.refresh}>Try reconnecting</Button></>
      : offline ? <><h2 className={styles.sectionTitle}>Your saved reading summary</h2><p>{periodLabel}</p><StatsMetrics stats={stats}/><p className={styles.copy}>These are your last saved stats. Recent changes may not appear until you reconnect.</p><Button className={styles.button} onClick={home.refresh}>Try reconnecting</Button><Button className={styles.button} variant="secondary" onClick={() => openBooks()}>Browse saved Library</Button>{view === "books" && books.map(book => <section key={book.id} className={styles.card}><h3>{book.title}</h3><p>{book.author}</p><p>Finished {book.finishedAt}</p></section>)}</>
      : view === "period" ? <><h2 className={styles.sectionTitle}>Choose a period</h2><p className={styles.copy}>Stats use each book’s recorded finish date.</p><Button className={styles.button} onClick={() => choosePeriod(new Date().getFullYear())}>{new Date().getFullYear()} · This year</Button><Button className={styles.button} variant="secondary" onClick={() => choosePeriod("all")}>All time</Button>{stats.years.filter(year => year !== new Date().getFullYear()).map(year => <Button className={styles.button} variant="secondary" key={year} onClick={() => choosePeriod(year)}>{year}</Button>)}<p className={styles.muted}>Books without a finish date are excluded until you add one.</p></>
      : view === "books" ? <><h2 className={styles.sectionTitle}>{books.length} finished {books.length === 1 ? "book" : "books"} · {filter?.label || periodLabel}</h2><p>The records behind this chart.</p>
        {!books.length && <p>No books match this chart. Choose another category or period.</p>}
        {books.map(book => <section key={book.id} className={styles.card}>
          <div className={styles.bookTop}><Link href={`/library/${book.id}`} aria-label={`Open ${book.title}`}><BookCover src={book.coverSrc} title={book.title} author={book.author} size="search" decorative/></Link><div><h3><Link className={styles.bookTitle} href={`/library/${book.id}`}>{book.title}</Link></h3><p className={styles.muted}>{book.author}</p></div></div>
          <p>{book.pageCount ? `${book.pageCount} pages` : "Page count not recorded"} · {primaryGenre(book)} · {book.rating ? `${book.rating} stars` : "Unrated"}</p><p className={styles.muted}>{book.finishedAt ? `Finished ${book.finishedAt}` : "Finish date not recorded"}</p>
          <button className={styles.chartAction} onClick={() => edit(book)}>Edit reading record</button>
        </section>)}<Button className={styles.button} onClick={() => { setView(previousView); setFilter(null); }}>Back to stats</Button></>
      : <>
        <Button className={`${styles.button} ${styles.period}`} variant="secondary" onClick={periods}>{periodLabel} · Change period</Button>
        {stats.total === 0 ? <><h2 className={styles.sectionTitle}>No finished books in this period</h2><p className={styles.copy}>Choose another period, or add a finish date to books you have already read.</p><Button className={styles.button} onClick={periods}>Choose another period</Button><Button className={styles.button} variant="secondary" href="/library">Open my Library</Button></>
        : view === "overview" ? <><StatsMetrics stats={stats} onSelect={index => index === 2 ? setView("ratings") : openBooks()}/>{timeChart()}{formatChart()}{genreChart()}{moodChart()}{paceChart()}{lengthChart()}{ratingsChart()}<Button className={styles.button} onClick={() => openBooks()}>View the {stats.total} finished books</Button></>
        : view === "time" ? <><h2 className={styles.sectionTitle}>Reading over time</h2><p>{stats.total} books finished · {stats.knownPages ? `${stats.pages.toLocaleString()} recorded pages` : "Page counts not recorded"}</p>{timeChart()}{formatChart()}<p className={styles.muted}>Pages use the recorded length of finished editions. Current reading and DNF books are excluded.</p><Button className={styles.button} onClick={() => openBooks()}>View finished books</Button></>
        : view === "genres" ? <><h2 className={styles.sectionTitle}>Genres and moods</h2>{genreChart()}{moodChart()}<p className={styles.muted}>Moods describe the books, not you.</p><Button className={styles.button} onClick={() => openBooks()}>View finished books</Button></>
        : view === "pace" ? <><h2 className={styles.sectionTitle}>Pace and book length</h2>{paceChart()}{lengthChart()}</>
        : <><h2 className={styles.sectionTitle}>Your ratings</h2><section className={styles.card}><h2>{stats.average} out of 5</h2><p>{stats.rated} rated finished books · {stats.unrated} left unrated</p></section>{ratingsChart()}<p className={styles.muted}>Whole stars only. Unrated books count towards books finished and are excluded from the average. Ratings are optional.</p><Button className={styles.button} variant="secondary" onClick={() => openBooks("rating", "Unrated")}>View unrated books</Button></>}
        {stats.undated > 0 && <button className={styles.chartAction} onClick={() => openBooks("undated", null, "No finish date")}>{stats.undated} finished books need a finish date ›</button>}
        {stats.futureDated > 0 && <p className={styles.muted}>{stats.futureDated} future-dated finishes are excluded until their recorded date.</p>}
      </>}
    </div>
    <BottomNavigation variant="home" activePath="/home" assetDirectory="reading-stats"/>
    <BottomSheet open={Boolean(record)} title="Edit reading record" onClose={() => { if (!busy.current) setRecord(null); }}>
      {record && <form className={styles.form} onSubmit={save}><h3>{record.title}</h3>
        <label>Finish date<input type="date" max={localDate()} value={record.finishedAt} onChange={event => setRecord({ ...record, finishedAt: event.target.value })} disabled={saving}/></label>
        <p>Clearing the finish date excludes this book from period stats.</p>
        <label>Reading format<select value={record.format} onChange={event => setRecord({ ...record, format: event.target.value })} disabled={saving}><option value="">Not recorded</option>{readingFormats.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Primary genre<input value={record.primaryGenre} maxLength={80} placeholder="Use Google Books category" onChange={event => setRecord({ ...record, primaryGenre: event.target.value })} disabled={saving}/></label>
        <label>Story pace<select value={record.pace} onChange={event => setRecord({ ...record, pace: event.target.value })} disabled={saving}><option value="">Not recorded</option>{storyPaces.map(value => <option key={value}>{value}</option>)}</select></label>
        <fieldset className={styles.moods}><legend>Book moods (optional)</legend>{bookMoods.map(mood => <label className={styles.mood} key={mood}><input type="checkbox" checked={record.moods.includes(mood)} onChange={event => setRecord({ ...record, moods: event.target.checked ? [...record.moods, mood] : record.moods.filter(value => value !== mood) })} disabled={saving}/>{mood}</label>)}</fieldset>
        {error && <InlineAlert type="error">{error}</InlineAlert>}<Button type="submit" loading={saving} disabled={offline}>Save reading record</Button>
      </form>}
    </BottomSheet>
  </section>;
}
