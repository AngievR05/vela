import { describeDNASignals } from "./reading-dna.js";
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
    stoppedAt: row.stopped_at || null, finishFeedback: row.finish_feedback || [], finishUse: row.finish_use_for_learning || false, ratingUse: row.rating_use_for_learning ?? true, historyUse: row.history_use_for_learning ?? true, dnfReasons: row.dnf_reasons || [], privateDnfNote: row.private_dnf_note || "",
    dnfUse: row.dnf_use_for_learning, startedAt: row.started_at, finishedAt: row.finished_at, updatedAt: row.updated_at,
    description: book.description || null, categories: book.categories || [], publishedDate: book.published_date || null, isbn: book.isbn || null,
    favourite: row.is_favourite || false, notes: row.notes || "", currentPage: row.current_page ?? null, isRemoved: row.is_removed || false, dnfReason: row.dnf_reason || null,
  };
}
const libraryColumns = "stopped_at,finish_feedback,finish_use_for_learning,rating_use_for_learning,history_use_for_learning,dnf_reasons,private_dnf_note,id,book_id,status,progress_percent,current_page,rating,notes,is_favourite,is_removed,dnf_reason,dnf_use_for_learning,started_at,finished_at,updated_at,books!inner(google_books_id,title,authors,page_count,thumbnail_url,description,categories,published_date,isbn)";
export async function loadReaderBook(supabase, userId, id) {
  const { data, error } = await supabase.from("user_books").select(libraryColumns).eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("We couldn’t load this book. Please try again.");
  return data ? mapLibraryBook(data) : null;
}
export async function loadHome(supabase, userId) {
  const [profile, settings, library, rawSignals] = await Promise.all([
    supabase.from("profiles").select("display_name,reading_dna_reset_at").eq("id", userId).single(),
    supabase.from("ai_settings").select("personalisation_enabled,use_recent_ratings,use_dnf_reasons,use_recent_history").eq("user_id", userId).single(),
    allReaderRows(supabase, "user_books", libraryColumns, userId, { is_removed: false }),
    allReaderRows(supabase, "reading_dna_signals", "id,category,label,source_type,evidence,active,internal_weight,influence_state,created_at,updated_at", userId, { active: true }),
  ]);
  if (profile.error || settings.error) throw new Error("Reader preferences unavailable");
  const books = library.map(mapLibraryBook);
  const signals = describeDNASignals(rawSignals, books, settings.data, profile.data.reading_dna_reset_at)
    .filter(signal => signal.active).map(signal => ({
      id: signal.id, category: signal.category, label: signal.label, source: signal.source, strength: signal.strength,
      evidence: signal.evidence.filter(item => item.bookId).map(item => ({ id: item.bookId, title: books.find(book => book.id === item.bookId).title })),
    }));
  return { version: 1, userId, displayName: profile.data.display_name, fetchedAt: Date.now(), books,
    personalisationEnabled: settings.data.personalisation_enabled, signals };
}

export async function mutateReaderBook(supabase, userId, mutation) {
  const { data: row, error: readError } = await supabase.from("user_books").select(libraryColumns)
    .eq("id", mutation.id).eq("user_id", userId).maybeSingle();
  if (readError) return { status: 503, error: "We couldn’t load this book. Please try again." };
  if (!row) return { status: 404, error: "This book is no longer in your Library." };
  if (["finish","dnf","reading_dates","restore_reading","undo_reading"].includes(mutation.kind) || (mutation.kind === "progress" && mutation.operationId)) {
    const { data, error } = await supabase.rpc("save_reader_update", { book_entry: mutation.id, changes: mutation });
    if (error) return { status: error.code === "40001" ? 409 : error.code === "42501" ? 403 : ["22023","23514"].includes(error.code) ? 400 : 503,
      error: error.code === "40001" ? "This book changed. Your entries are still here. Refresh the book before trying again." : error.code === "22023" ? error.message : "Your update wasn’t saved. Your entries are still here; please try again." };
    return { ...data, book: await loadReaderBook(supabase,userId,mutation.id) };
  }
  if (mutation.expectedUpdatedAt && Date.parse(mutation.expectedUpdatedAt) !== Date.parse(row.updated_at))
    return { status: 409, error: "This book changed after you saved it. Open its latest details before saving." };
  if (row.is_removed && mutation.kind !== "restore" && mutation.kind !== "remove") return { status: 409, error: "This book has been removed. Restore it before editing." };
  if (["status", "review", "remove", "restore"].includes(mutation.kind)) {
    const date = new Date().toISOString().slice(0, 10);
    const changes = mutation.kind === "remove" ? { is_removed: true } : mutation.kind === "restore" ? { is_removed: false }
      : mutation.kind === "review" ? { rating: mutation.rating, ...(mutation.ratingUse!=null ? {rating_use_for_learning:mutation.ratingUse} : {}), notes: mutation.notes, is_favourite: mutation.favourite }
        : { status: mutation.status, finished_at: mutation.status === "finished" ? date : null,
          progress_percent: mutation.status === "finished" ? 100 : row.progress_percent === 100 ? 0 : row.progress_percent,
          current_page: mutation.status === "finished" ? row.books.page_count || null : row.progress_percent === 100 ? null : row.current_page,
          dnf_reason: mutation.status === "dnf" ? mutation.reason : null,
          dnf_use_for_learning: mutation.status === "dnf" && mutation.useForLearning,
          started_at: ["reading", "finished"].includes(mutation.status) ? row.started_at || date : row.started_at };
    const result = await supabase.from("user_books").update(changes).eq("id", mutation.id).eq("user_id", userId)
      .eq("updated_at", mutation.expectedUpdatedAt || row.updated_at).select(libraryColumns).maybeSingle();
    if (result.error) return { status: 503, error: "Your changes weren’t saved. Your input is still here; please try again." };
    if (!result.data) return { status: 409, error: "This book changed while saving. Refresh and try again." };
    return { book: mapLibraryBook(result.data) };
  }
  const eligible = mutation.kind === "start" ? ["want_to_read", "reading"] : ["reading", "finished"];
  if (!eligible.includes(row.status)) return { status: 409, error: "This book’s reading status changed. Refresh your Library before updating it." };
  if (mutation.kind === "progress" && row.status === "finished" && mutation.percent < 100)
    return { status: 409, error: "This book has already been marked finished. Refresh before changing its status." };
  const date = new Date().toISOString().slice(0, 10);
  const pagePercent = mutation.page === row.books.page_count ? 100 : Math.min(99, Math.round(mutation.page * 100 / row.books.page_count));
  if (mutation.page != null && (!row.books.page_count || mutation.page > row.books.page_count || pagePercent !== mutation.percent))
    return { status: 400, error: "Check the current page and total pages." };
  const changes = mutation.kind === "start" ? { status: "reading", started_at: row.started_at || date }
    : { progress_percent: mutation.percent, current_page: mutation.page ?? null, status: "reading",
      started_at: row.started_at || date, finished_at: null };
  const { data, error } = await supabase.from("user_books").update(changes).eq("id", mutation.id).eq("user_id", userId)
    .eq("status", row.status).eq("updated_at", mutation.expectedUpdatedAt || row.updated_at).select(libraryColumns).maybeSingle();
  if (error) return { status: 503, error: "Your progress wasn’t saved. Your input is still here; please try again." };
  if (!data) return { status: 409, error: "This book changed while saving. Refresh and try again." };
  return { book: mapLibraryBook(data) };
}

export async function saveLibraryBook(supabase, userId, googleBooksId, lookup, status = "want_to_read") {
  let { data: book, error } = await supabase.from("books").select("id").eq("google_books_id", googleBooksId).maybeSingle();
  if (error) throw new Error("Cache unavailable");
  if (!book) {
    const metadata = await lookup(googleBooksId);
    if (!metadata) return { status: 404, error: "This book is no longer available. Try another search." };
    const inserted = await supabase.from("books").upsert({
      google_books_id: metadata.googleBooksId, title: metadata.title, authors: metadata.authors,
      description: metadata.description, page_count: metadata.pageCount, categories: metadata.categories,
      published_date: metadata.publishedDate, thumbnail_url: metadata.thumbnailUrl, isbn: metadata.isbns?.[0] || null,
    }, { onConflict: "google_books_id", ignoreDuplicates: true });
    if (inserted.error) throw new Error("Book cache insert failed");
    const cached = await supabase.from("books").select("id").eq("google_books_id", googleBooksId).single();
    if (cached.error) throw new Error("Book cache read failed");
    book = cached.data;
  }
  // Duplicate adds must never reset an existing book's status or progress.
  const existing = await supabase.from("user_books").select(libraryColumns).eq("user_id", userId).eq("book_id", book.id).maybeSingle();
  if (existing.error) throw new Error("Library read failed");
  if (existing.data) {
    if (existing.data.is_removed) {
      const restored = await mutateReaderBook(supabase, userId, { kind: "restore", id: existing.data.id });
      if (restored.error) throw new Error("Library restore failed");
      return { added: true, restored: true, book: restored.book };
    }
    return { added: false, duplicate: true, book: mapLibraryBook(existing.data) };
  }
  const added = await supabase.from("user_books").upsert({ user_id: userId, book_id: book.id, status,
    ...(status === "reading" ? { started_at: new Date().toISOString().slice(0, 10) } : {}) },
    { onConflict: "user_id,book_id", ignoreDuplicates: true });
  if (added.error) throw new Error("Library insert failed");
  const saved = await supabase.from("user_books").select(libraryColumns).eq("user_id", userId).eq("book_id", book.id).single();
  if (saved.error) throw new Error("Library read failed");
  return { added: true, book: mapLibraryBook(saved.data) };
}

