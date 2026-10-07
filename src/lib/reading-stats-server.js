import { loadHome, allReaderRows } from "./reader-library.js";

export async function loadReadingStats(supabase, userId) {
  const snapshot = await loadHome(supabase, userId);
  // The basic charts remain available while the optional metadata migration is deployed.
  const probe = await supabase.from("reader_book_stats").select("id").eq("user_id", userId).limit(1);
  if (probe.error) {
    if (["42P01", "PGRST205"].includes(probe.error.code)) return { ...snapshot, statsRecords: [], statsSetupRequired: true };
    throw new Error("Reading records unavailable");
  }
  const rows = await allReaderRows(supabase, "reader_book_stats", "id,reading_format,primary_genre,moods,story_pace,updated_at", userId);
  const books = new Map(snapshot.books.map(book => [book.id, book]));
  return { ...snapshot, statsSetupRequired: false, statsRecords: rows.filter(row => books.has(row.id)).map(row => ({
    id: row.id, finishedAt: books.get(row.id).finishedAt, format: row.reading_format,
    primaryGenre: row.primary_genre || "", moods: row.moods, pace: row.story_pace, updatedAt: row.updated_at,
  })) };
}
