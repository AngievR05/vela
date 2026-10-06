"use client";

import { useRef, useState } from "react";
import SearchField from "@/components/ui/SearchField";
import Button from "@/components/ui/Button";
import InlineAlert from "@/components/ui/InlineAlert";
import BookSearchResultRow from "@/components/books/BookSearchResultRow";

export default function BookDiscovery({ savedIds }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [added, setAdded] = useState(savedIds);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const busy = useRef(false);

  async function search(event) {
    event.preventDefault();
    if (busy.current) return;
    if (query.trim().length < 2) { setError("Enter at least two characters to search."); return; }
    busy.current = true; setSearching(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query.trim())}`, { signal: AbortSignal.timeout(20000) });
      if (response.status === 401) { window.location.replace("/login?next=/discover"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Book search is temporarily unavailable.");
      setResults(body.books); setSearched(true);
    } catch (failure) {
      setError(failure.name === "TimeoutError" || failure instanceof TypeError ? "We couldn’t connect. Your search is still here; please try again." : failure.message);
    } finally { busy.current = false; setSearching(false); }
  }
  async function save(book) {
    if (busy.current) return;
    busy.current = true; setAddingId(book.googleBooksId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleBooksId: book.googleBooksId }), signal: AbortSignal.timeout(20000) });
      if (response.status === 401) { window.location.replace("/login?next=/discover"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "We couldn’t save this book. Please try again.");
      setAdded((ids) => [...ids, book.googleBooksId]); setNotice(`${book.title} added to your Library.`);
    } catch (failure) {
      setError(failure.name === "TimeoutError" || failure instanceof TypeError ? "We couldn’t connect. Your search is still here; please try again." : failure.message);
    } finally { busy.current = false; setAddingId(null); }
  }
  return <div className="stack" style={{ marginTop: "2rem" }}>
    <form className="stack" onSubmit={search}>
      <SearchField label="Find your next book" value={query} maxLength={200} onChange={event => setQuery(event.target.value)} disabled={searching || Boolean(addingId)} placeholder="Title, author or reading mood" />
      <Button type="submit" loading={searching} disabled={Boolean(addingId)}>Search books</Button>
    </form>
    {error && <InlineAlert type="error">{error}</InlineAlert>}
    {notice && <p role="status">{notice}</p>}
    {searched && !results.length && <p className="muted">No books found. Try another title or author.</p>}
    {results.map(book => <BookSearchResultRow key={book.googleBooksId} title={book.title} author={book.authors.join(", ")}
      coverSrc={book.thumbnailUrl} metadata={book.pageCount ? `${book.pageCount} pages` : null}
      alreadyAdded={added.includes(book.googleBooksId)} adding={addingId === book.googleBooksId} onAdd={() => save(book)} />)}
    <Button href="/library" variant="secondary">Open Library</Button>
  </div>;
}
