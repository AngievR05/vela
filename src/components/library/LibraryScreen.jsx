"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import LibraryShell from "./LibraryShell";
import BookDetail from "./BookDetail";
import useHome from "@/components/home/useHome";
import { filterLibrary, libraryStatuses } from "@/lib/library-data";
import BookCover from "@/components/books/BookCover";
import Button from "@/components/ui/Button";
import SearchField from "@/components/ui/SearchField";
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import InlineAlert from "@/components/ui/InlineAlert";
import BottomSheet from "@/components/feedback/BottomSheet";
import SkeletonLoader from "@/components/states/SkeletonLoader";
import styles from "./Library.module.css";
const sortLabels = { recent: "Recent", title: "Title A–Z", author: "Author A–Z", rating: "Highest rated" };
export default function LibraryScreen({ userId, initialTab = "all" }) {
  const [offlineBook, setOfflineBook] = useState(null);
  return offlineBook ? <BookDetail userId={userId} initialBook={offlineBook} onBack={() => setOfflineBook(null)} />
    : <LibraryShelves userId={userId} initialTab={initialTab} onOfflineBook={setOfflineBook} />;
}
function LibraryShelves({ userId, initialTab, onOfflineBook }) {
  const home = useHome(userId);
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState("shelf");
  const [filters, setFilters] = useState({ genres: [], short: false, favourites: false });
  const [draft, setDraft] = useState(filters);
  const [modal, setModal] = useState(null);
  const close = useCallback(() => setModal(null), []);
  const books = useMemo(() => home.snapshot?.books.filter(book => !book.isRemoved) || [], [home.snapshot]);
  const visible = filterLibrary(books, { ...filters, status: tab, query, sort });
  const genreChoices = [...new Set(books.flatMap(book => book.categories.flatMap(category => category.split("/").map(part => part.trim()))))].filter(Boolean).slice(0,30);
  const offline = !home.online || home.phase === "offline";
  const activeFilters = filters.genres.length + Number(filters.short) + Number(filters.favourites);
  const code = home.phase === "loading" ? "D15" : offline ? "D14" : query ? visible.length ? "D09" : "D10" : !books.length ? "D06" : !visible.length ? "D07" : view === "grid" ? "D13" : { all:"D01", reading:"D02", want_to_read:"D03", finished:"D04", dnf:"D05" }[tab];
  function cover(book) {
    return <Link key={book.id} href={`/library/${book.id}`} className={styles.bookLink} aria-label={`Open ${book.title} by ${book.author || "unknown author"}`} onClick={event => { if (offline) { event.preventDefault(); onOfflineBook(book); } }}>
      <BookCover title={book.title} author={book.author} src={book.coverSrc} size="card" placeholderType="book" className={styles.shelfCover} decorative />
      <span className={styles.bookTitle}>{book.title}</span>
      <span className={styles.bookAuthor}>{book.author}</span>
    </Link>;
  }
  return <LibraryShell title="My Library" subtitle={`${books.length} ${books.length === 1 ? "BOOK" : "BOOKS"}`} code={code}
    action={<Button href="/library/add" className={styles.addButton} disabled={offline}>+ Add book</Button>}>
    <Tabs label="Library shelves" items={[{value:"all",label:"All",panelId:"library-books"},...["reading","want_to_read","finished","dnf"].map(value=>({...libraryStatuses.find(item=>item.value===value),label:value==="dnf"?"Set aside":libraryStatuses.find(item=>item.value===value).label,panelId:"library-books"}))]} value={tab} onChange={setTab} className={styles.tabs} />
    <SearchField label="Search your Library" placeholder="Search title or author" value={query} onChange={event=>setQuery(event.target.value)} maxLength={200} className={styles.search} />
    <div className={styles.tools}><Button variant="secondary" onClick={()=>{setDraft(filters);setModal("filter");}}>Filter{activeFilters ? ` (${activeFilters})` : ""}</Button>
      <Button variant="secondary" onClick={()=>setModal("sort")}>Sort: {sortLabels[sort]}</Button>
      <span className={styles.resultCount}>{visible.length} books</span>
    </div>
    <Button variant={view==="shelf"?"secondary":"primary"} className={styles.viewButton} onClick={()=>setView(view === "shelf" ? "grid" : "shelf")}>{view === "shelf" ? "Switch to grid view  ›" : "Switch to shelves"}</Button>
    {offline && <InlineAlert type="info">You’re offline. Saved books are available here; progress changes will sync when you reconnect.</InlineAlert>}
    {home.syncError && <InlineAlert type="error">{home.syncError}<Button variant="tertiary" onClick={home.refresh} disabled={offline}>Retry sync</Button></InlineAlert>}
    <div role="tabpanel" id="library-books" aria-label="Library books">
      {home.phase === "loading" ? <SkeletonLoader variant="library" label="Loading your Library" /> : home.phase === "error" ? <Card className={styles.empty}><h2>Library could not refresh.</h2><p>Your books are safe. Please try again.</p><Button onClick={home.refresh}>Retry</Button></Card>
        : !visible.length ? <Card className={styles.empty}><h2>{query ? "No books found" : books.length ? "This shelf is waiting." : "Your Library starts here."}</h2>
          <p>{query || activeFilters ? "Try another search or clear your filters." : "Add a book and give your next chapter a place."}</p>
          {query || activeFilters ? <Button variant="secondary" onClick={()=>{setQuery("");setFilters({genres:[],short:false,favourites:false});}}>Clear search and filters</Button> : <Button href="/library/add" disabled={offline}>Add a book</Button>}
        </Card> : view === "grid" ? <div className={styles.grid}>{visible.map(cover)}</div> : <div className={styles.shelves}>{libraryStatuses.filter(item=>tab === "all" || item.value === tab).map(item=>{
          const shelf = visible.filter(book=>book.status === item.value);
          return <section key={item.value} className={styles.shelf}><div className={styles.shelfHeading}><h2>{item.heading}</h2><p>{shelf.length} {shelf.length === 1 ? "book" : "books"}</p></div>
            {shelf.length ? <div className={styles.shelfBooks}>{shelf.map(cover)}</div> : <div className={styles.emptyShelf}>No books on this shelf yet.</div>}
          </section>;
        })}</div>}
    </div>
    <BottomSheet className={styles.sheet} backdropClassName={styles.backdrop} open={modal === "filter"} title="Filter Library" onClose={close}>
      <div className={styles.form}>{genreChoices.map(genre=><Checkbox key={genre} label={genre} checked={draft.genres.includes(genre)} onChange={event=>setDraft({...draft,genres:event.target.checked?[...draft.genres,genre]:draft.genres.filter(value=>value!==genre)})} />)}
        {!genreChoices.length && <p>Genre filters become available when books have genre information.</p>}
        <Checkbox label="Under 400 pages" checked={draft.short} onChange={event=>setDraft({...draft,short:event.target.checked})} />
        <Checkbox label="Favourites only" checked={draft.favourites} onChange={event=>setDraft({...draft,favourites:event.target.checked})} />
        <Button onClick={()=>{setFilters(draft);setModal(null);}}>Show {filterLibrary(books,{...draft,status:tab,query}).length} books</Button>
        <Button variant="tertiary" onClick={()=>setDraft({genres:[],short:false,favourites:false})}>Clear filters</Button>
        <Button variant="secondary" onClick={close}>Cancel</Button>
      </div>
    </BottomSheet>
    <BottomSheet className={styles.sheet} backdropClassName={styles.backdrop} open={modal === "sort"} title="Sort books" onClose={close}>
      <div className={styles.form}>{Object.entries(sortLabels).map(([value,label])=><label key={value} className={styles.choice}><input type="radio" name="library-sort" checked={sort === value} onChange={()=>{setSort(value);setModal(null);}} />{value === "recent" ? "Recently updated" : label}</label>)}</div>
    </BottomSheet>
  </LibraryShell>;
}
