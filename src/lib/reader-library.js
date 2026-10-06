// Reader data operations accept an authenticated, RLS-scoped client; no service credentials.

export async function allReaderRows(supabase, table, columns, userId, filter = {}) {
  const rows = [];
  for (let offset = 0; offset < 50000; offset += 500) {
    let query = supabase.from(table).select(columns).eq("user_id", userId);
    for (const [key, value] of Object.entries(filter)) query = query.eq(key, value);
    const result = await query.order("updated_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
    if (result.error) throw new Error("Reader data unavailable");
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
  throw new Error("Library exceeds the supported summary size");
}

export function mapLibraryBook(row) {
  const book = row.books;
  return {
    id: row.id, bookId: row.book_id, googleBooksId: book.google_books_id, title: book.title, author: (book.authors || []).join(", "),
    pageCount: book.page_count > 0 ? book.page_count : null, coverSrc: book.thumbnail_url || null,
    status: row.status, progressPercent: row.progress_percent, rating: row.rating,
    dnfUse: row.dnf_use_for_learning, startedAt: row.started_at, finishedAt: row.finished_at, updatedAt: row.updated_at,
  };
}
const libraryColumns = "id,book_id,status,progress_percent,rating,dnf_use_for_learning,started_at,finished_at,updated_at,books!inner(google_books_id,title,authors,page_count,thumbnail_url)";
export async function loadHome(supabase, userId) {
  const [profile, settings, library, rawSignals] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    supabase.from("ai_settings").select("personalisation_enabled,use_recent_ratings,use_dnf_reasons,use_recent_history").eq("user_id", userId).single(),
    allReaderRows(supabase, "user_books", libraryColumns, userId),
    allReaderRows(supabase, "reading_dna_signals", "id,category,label,source_type,evidence,updated_at", userId, { active: true }),
  ]);
  if (profile.error || settings.error) throw new Error("Reader preferences unavailable");
  const books = library.map(mapLibraryBook);
  const signals = [];
  if (settings.data.personalisation_enabled) for (const signal of rawSignals) {
    if (signal.source_type === "rating" && !settings.data.use_recent_ratings) continue;
    if (signal.source_type === "dnf" && !settings.data.use_dnf_reasons) continue;
    // Mixed evidence has no per-source permission map yet; do not infer consent.
    if (signal.source_type === "mixed") continue;
    const entries = Array.isArray(signal.evidence) ? signal.evidence : [signal.evidence];
    const evidence = [];
    for (const entry of entries) {
      const id = typeof entry === "string" ? entry : entry?.user_book_id || entry?.book_id || entry?.bookId || entry?.id;
      const book = books.find((item) => item.id === id || item.bookId === id);
      if (!book || (signal.source_type === "rating" && book.rating == null)
        || (signal.source_type === "dnf" && (book.status !== "dnf" || !book.dnfUse))) continue;
      if (!evidence.some((item) => item.id === book.id)) evidence.push({ id: book.id, title: book.title });
    }
    if (["rating", "dnf"].includes(signal.source_type) && !evidence.length) continue;
    signals.push({ id: signal.id, category: signal.category, label: signal.label, source: signal.source_type, evidence });
  }
  return { version: 1, userId, displayName: profile.data.display_name, fetchedAt: Date.now(), books,
    personalisationEnabled: settings.data.personalisation_enabled, signals };
}

export async function mutateReaderBook(supabase, userId, mutation) {
  const { data: row, error: readError } = await supabase.from("user_books").select("id,status,started_at,progress_percent")
    .eq("id", mutation.id).eq("user_id", userId).maybeSingle();
  if (readError) return { status: 503, error: "We couldn’t load this book. Please try again." };
  if (!row) return { status: 404, error: "This book is no longer in your Library." };
  const eligible = mutation.kind === "start" ? ["want_to_read", "reading"] : ["reading", "finished"];
  if (!eligible.includes(row.status)) return { status: 409, error: "This book’s reading status changed. Refresh your Library before updating it." };
  if (mutation.kind === "progress" && row.status === "finished" && mutation.percent < 100)
    return { status: 409, error: "This book has already been marked finished. Refresh before changing its status." };
  const date = new Date().toISOString().slice(0, 10);
  const changes = mutation.kind === "start" ? { status: "reading", started_at: row.started_at || date }
    : { progress_percent: mutation.percent, status: mutation.percent === 100 ? "finished" : "reading",
      started_at: row.started_at || date, finished_at: mutation.percent === 100 ? date : null };
  const { data, error } = await supabase.from("user_books").update(changes).eq("id", mutation.id).eq("user_id", userId)
    .eq("status", row.status).select(libraryColumns).maybeSingle();
  if (error) return { status: 503, error: "Your progress wasn’t saved. Your input is still here; please try again." };
  if (!data) return { status: 409, error: "This book changed while saving. Refresh and try again." };
  return { book: mapLibraryBook(data) };
}

export async function saveLibraryBook(supabase, userId, googleBooksId, lookup) {
  let { data: book, error } = await supabase.from("books").select("id").eq("google_books_id", googleBooksId).maybeSingle();
  if (error) throw new Error("Cache unavailable");
  if (!book) {
    const metadata = await lookup(googleBooksId);
    if (!metadata) return { status: 404, error: "This book is no longer available. Try another search." };
    const inserted = await supabase.from("books").upsert({
      google_books_id: metadata.googleBooksId, title: metadata.title, authors: metadata.authors,
      description: metadata.description, page_count: metadata.pageCount, categories: metadata.categories,
      published_date: metadata.publishedDate, thumbnail_url: metadata.thumbnailUrl,
    }, { onConflict: "google_books_id", ignoreDuplicates: true });
    if (inserted.error) throw new Error("Book cache insert failed");
    const cached = await supabase.from("books").select("id").eq("google_books_id", googleBooksId).single();
    if (cached.error) throw new Error("Book cache read failed");
    book = cached.data;
  }
  // Duplicate adds must never reset an existing book's status or progress.
  const added = await supabase.from("user_books").upsert({ user_id: userId, book_id: book.id, status: "want_to_read" },
    { onConflict: "user_id,book_id", ignoreDuplicates: true });
  if (added.error) throw new Error("Library insert failed");
  return { added: true };
}

