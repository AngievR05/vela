import { z } from "zod";
import { detailMutationSchema } from "./library-data.js";
import { statsRecordSchema } from "./reading-stats.js";
import { localDate } from "./reading-calendar.js";
export { localDate } from "./reading-calendar.js";

export const libraryBookSchema = z.object({
  id: z.uuid(), bookId: z.uuid(), googleBooksId: z.string(), title: z.string().min(1), author: z.string(),
  pageCount: z.number().int().positive().nullable(), coverSrc: z.string().nullable(),
  status: z.enum(["want_to_read", "reading", "finished", "dnf"]),
  progressPercent: z.number().int().min(0).max(100), rating: z.number().int().min(1).max(5).nullable(),
  dnfUse: z.boolean(), startedAt: z.string().nullable(), finishedAt: z.string().nullable(), updatedAt: z.string(),
  description: z.string().nullable().default(null), categories: z.array(z.string()).default([]), publishedDate: z.string().nullable().default(null), isbn: z.string().nullable().default(null),
  favourite: z.boolean().default(false), notes: z.string().default(""), currentPage: z.number().int().nonnegative().nullable().default(null), isRemoved: z.boolean().default(false), dnfReason: z.string().nullable().default(null),
});
export const homeSnapshotSchema = z.object({
  version: z.literal(1), userId: z.uuid(), displayName: z.string(), fetchedAt: z.number(),
  books: z.array(libraryBookSchema).max(50000),
  personalisationEnabled: z.boolean(),
  statsRecords: z.array(statsRecordSchema).max(50000).default([]),
  statsSetupRequired: z.boolean().default(false),
  signals: z.array(z.object({
    id: z.uuid(), category: z.string(), label: z.string(), source: z.string(),
    evidence: z.array(z.object({ id: z.uuid(), title: z.string() })),
  })),
});
export const bookMutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("progress"), id: z.uuid(), percent: z.number().int().min(0).max(100), page: z.number().int().nonnegative().optional() }).strict(),
  z.object({ kind: z.literal("start"), id: z.uuid() }).strict(),
  ...detailMutationSchema.options,
]);
export const addBookSchema = z.object({ googleBooksId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), status: z.enum(["want_to_read", "reading"]).default("want_to_read") }).strict();
export function homeCacheKey(userId) { return `vela:home:v1:${userId}`; }
export function homeQueueKey(userId) { return `vela:home-progress:v1:${userId}`; }
export function parseHomeSnapshot(raw, userId) {
  try {
    const parsed = homeSnapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.userId === userId ? parsed.data : null;
  } catch { return null; }
}
export function parseHomeQueue(raw) {
  try {
    const parsed = z.array(bookMutationSchema).max(500).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch { return []; }
}
export function queueMutation(queue, mutation) {
  // Keep only the latest progress for each book; starting must precede progress.
  const next = queue.filter((item) => item.id !== mutation.id || item.kind !== mutation.kind);
  if (next.length >= 500) throw new Error("This device has many saved updates. Reconnect and sync them before adding another.");
  const progressIndex = mutation.kind === "start" ? next.findIndex((item) => item.id === mutation.id && item.kind === "progress") : -1;
  if (progressIndex >= 0) next.splice(progressIndex, 0, mutation);
  else next.push(mutation);
  return next;
}
export function applyBookMutation(snapshot, mutation, date = localDate()) {
  if (["remove", "restore", "review", "status"].includes(mutation.kind)) return { ...snapshot, books: snapshot.books.map(book => book.id !== mutation.id ? book : {
    ...book, ...(mutation.kind === "remove" ? { isRemoved: true } : mutation.kind === "restore" ? { isRemoved: false }
      : mutation.kind === "review" ? { rating: mutation.rating, notes: mutation.notes, favourite: mutation.favourite }
        : { status: mutation.status, finishedAt: mutation.status === "finished" ? date : null,
          progressPercent: mutation.status === "finished" ? 100 : book.progressPercent === 100 ? 0 : book.progressPercent,
          currentPage: null, dnfReason: mutation.status === "dnf" ? mutation.reason : null,
          dnfUse: mutation.status === "dnf" && mutation.useForLearning, startedAt: mutation.status === "reading" || mutation.status === "finished" ? book.startedAt || date : book.startedAt }),
    updatedAt: new Date().toISOString(),
  }) };
  return { ...snapshot, books: snapshot.books.map((book) => book.id !== mutation.id ? book : {
    ...book, status: mutation.kind === "start" ? "reading" : mutation.percent === 100 ? "finished" : "reading",
    progressPercent: mutation.kind === "progress" ? mutation.percent : book.progressPercent,
    currentPage: mutation.kind === "progress" ? mutation.page ?? null : book.currentPage ?? null,
    startedAt: book.startedAt || date,
    finishedAt: mutation.kind === "progress" && mutation.percent === 100 ? date : null,
    updatedAt: new Date().toISOString(),
  }) };
}
export function deriveHome(snapshot, date = new Date()) {
  const books = snapshot.books.filter(book => !book.isRemoved).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
  const reading = books.filter((book) => book.status === "reading");
  const rated = books.filter((book) => book.rating != null);
  const today = localDate(date);
  return {
    state: books.length === 0 ? "new" : reading.length ? "populated" : "no-current",
    current: reading[0] || null, saved: books.find((book) => book.status === "want_to_read") || null,
    stats: {
      thisYear: books.filter((book) => book.status === "finished" && book.finishedAt?.startsWith(`${date.getFullYear()}-`) && book.finishedAt <= today).length,
      reading: reading.length,
      average: rated.length ? (rated.reduce((sum, book) => sum + book.rating, 0) / rated.length).toFixed(1) : "—",
    },
  };
}

export function homeInsight(snapshot) {
  if (!snapshot.personalisationEnabled) return { label: "YOU STAY IN CONTROL", text: "Personalisation is off. Your Library and reading tracker still work normally.", action: "Edit my choices →", signals: [] };
  const learned = snapshot.signals.filter((signal) => ["rating", "dnf"].includes(signal.source) && signal.evidence.length);
  const signals = learned.length ? learned : snapshot.signals;
  if (!signals.length) return { label: "YOUR READING DNA IS TAKING SHAPE", text: "Add or finish a few books to build your reading starting point.", action: "View Reading DNA →", signals: [] };
  const labels = signals.slice(0, 3).map((signal) => signal.label).join(", ");
  return {
    label: learned.length ? "ONE THING VELA NOTICED" : "YOUR READING STARTING POINT",
    text: learned.length ? `Your saved reading evidence includes ${labels}.` : `Your chosen reading signals include ${labels}.`,
    action: "See the evidence →", signals,
  };
}
