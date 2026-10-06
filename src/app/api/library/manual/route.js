import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { loadReaderBook } from "@/lib/home-server";
import { manualBookSchema } from "@/lib/library-data";
import { searchGoogleBooks } from "@/lib/google-books";
const normalise = value => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
export async function POST(request) {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const parsed = manualBookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the title, author, ISBN and total pages.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const value = parsed.data;
    let cover = null;
    try {
      const books = await searchGoogleBooks(value.isbn ? `isbn:${value.isbn}` : `intitle:${value.title} inauthor:${value.author}`, 5);
      const match = books.find(book => value.isbn ? book.isbns?.includes(value.isbn)
        : normalise(book.title) === normalise(value.title) && book.authors.some(author => normalise(author) === normalise(value.author)));
      cover = match?.thumbnailUrl || null;
    } catch { /* Manual entry remains available if Google Books is temporarily offline. */ }
    const result = await reader.supabase.rpc("add_manual_book", { entry_id: value.entryId, book_title: value.title, book_author: value.author,
      book_isbn: value.isbn || null, total_pages: value.pageCount, cover_url: cover });
    if (result.error) throw new Error("Manual save failed");
    const book = await loadReaderBook(reader.supabase, reader.user.id, result.data);
    if (!book) throw new Error("Manual save unavailable");
    return Response.json({ added: true, book }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "We couldn’t save this book. Your entry is still here; please try again." }, { status: 503 });
  }
}
