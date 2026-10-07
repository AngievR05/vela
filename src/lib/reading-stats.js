import { z } from "zod";
import { localDate } from "./reading-calendar.js";

export const bookMoods = ["Adventurous", "Emotional", "Reflective", "Cosy", "Dark", "Hopeful"];
export const readingFormats = ["Print", "Ebook", "Audiobook"];
export const storyPaces = ["Slow", "Medium", "Fast"];
export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const statsRecordSchema = z.object({
  id: z.uuid(), finishedAt: z.string().nullable(), format: z.enum(readingFormats).nullable(),
  primaryGenre: z.string().trim().max(80), moods: z.array(z.enum(bookMoods)).max(6).refine(v => new Set(v).size === v.length),
  pace: z.enum(storyPaces).nullable(), updatedAt: z.string(),
});
export const saveStatsRecordSchema = statsRecordSchema.omit({ id: true, updatedAt: true }).extend({
  finishedAt: z.string().refine(validDay, "Choose a valid finish date.").nullable(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
}).strict();
export function statsCacheKey(userId) { return `vela:stats:v1:${userId}`; }
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function primaryGenre(book) {
  if (book.primaryGenre) return book.primaryGenre;
  const categories = book.categories || [];
  for (const category of categories) {
    const parts = category.split(/\s*\/\s*/).filter(part => !/^(fiction|nonfiction|general|juvenile fiction)$/i.test(part));
    if (parts.length) return parts[0];
  }
  return "Not recorded";
}
export function deriveReadingStats(snapshot, period = String(new Date().getFullYear()), date = new Date()) {
  const today = localDate(date);
  const extra = new Map((snapshot.statsRecords || []).map(record => [record.id, record]));
  const allFinished = snapshot.books.filter(book => !book.isRemoved && book.status === "finished").map(book => ({
    ...book, ...extra.get(book.id), finishedAt: book.finishedAt, updatedAt: book.updatedAt, primaryGenre: extra.get(book.id)?.primaryGenre || "",
  }));
  const eligible = allFinished.filter(book => validDay(book.finishedAt || "") && book.finishedAt <= today);
  const books = eligible.filter(book => period === "all" || book.finishedAt.startsWith(`${period}-`))
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt) || a.title.localeCompare(b.title));
  const rated = books.filter(book => book.rating != null);
  const count = values => values.reduce((sum, book) => sum + (book.pageCount || 0), 0);
  const year = Number(period);
  const months = period === "all"
    ? [...new Set(eligible.map(book => book.finishedAt.slice(0, 4)))].sort().map(value => ({ key: value, label: value, count: books.filter(book => book.finishedAt.startsWith(`${value}-`)).length }))
    : Array.from({ length: year === date.getFullYear() ? date.getMonth() + 1 : 12 }, (_, i) => ({ key: `${period}-${String(i + 1).padStart(2, "0")}`, label: monthNames[i], count: books.filter(book => book.finishedAt.startsWith(`${period}-${String(i + 1).padStart(2, "0")}`)).length }));
  const groups = (labels, predicate) => labels.map(label => ({ key: label, label, count: books.filter(book => predicate(book, label)).length }));
  const genres = [...new Set(books.map(primaryGenre))].sort();
  return {
    books, allFinished, months, total: books.length, pages: count(books), knownPages: books.filter(book => book.pageCount != null).length,
    rated: rated.length, unrated: books.length - rated.length, average: rated.length ? (rated.reduce((sum, book) => sum + book.rating, 0) / rated.length).toFixed(1) : "—",
    undated: allFinished.filter(book => !validDay(book.finishedAt || "")).length,
    futureDated: allFinished.filter(book => validDay(book.finishedAt || "") && book.finishedAt > today).length,
    formats: groups([...readingFormats, "Not recorded"], (book, label) => (book.format || "Not recorded") === label),
    genres: groups(genres, (book, label) => primaryGenre(book) === label),
    moods: groups(bookMoods, (book, label) => (book.moods || []).includes(label)),
    paces: groups([...storyPaces, "Not recorded"], (book, label) => (book.pace || "Not recorded") === label),
    lengths: groups(["Under 200", "200–399", "400+", "Not recorded"], (book, label) => (book.pageCount == null ? "Not recorded" : book.pageCount < 200 ? "Under 200" : book.pageCount < 400 ? "200–399" : "400+") === label),
    ratings: groups(["1 star", "2 stars", "3 stars", "4 stars", "5 stars"], (book, label) => book.rating === Number(label[0])),
    years: [...new Set([date.getFullYear(), date.getFullYear() - 1, ...eligible.map(book => Number(book.finishedAt.slice(0, 4)))])].sort((a, b) => b - a),
  };
}

export function booksForStats(stats, filter) {
  if (!filter) return stats.books;
  if (filter.type === "book") return stats.allFinished.filter(book => book.id === filter.value);
  if (filter.type === "undated") return stats.allFinished.filter(book => !validDay(book.finishedAt || ""));
  return stats.books.filter(book => {
    const value = filter.value;
    if (filter.type === "month") return book.finishedAt.startsWith(value);
    if (filter.type === "format") return (book.format || "Not recorded") === value;
    if (filter.type === "genre") return primaryGenre(book) === value;
    if (filter.type === "mood") return (book.moods || []).includes(value);
    if (filter.type === "pace") return (book.pace || "Not recorded") === value;
    if (filter.type === "length") return (book.pageCount == null ? "Not recorded" : book.pageCount < 200 ? "Under 200" : book.pageCount < 400 ? "200–399" : "400+") === value;
    if (filter.type === "rating") return value === "Unrated" ? book.rating == null : book.rating === Number(value[0]);
    return true;
  });
}
