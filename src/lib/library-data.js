import { z } from "zod";

export const libraryStatuses = [
  { value: "reading", label: "Reading", heading: "Reading now" },
  { value: "want_to_read", label: "TBR", heading: "To be read" },
  { value: "dnf", label: "DNF", heading: "Did not finish" },
  { value: "finished", label: "Finished", heading: "Finished" },
];
export function validIsbn(value) {
  if (/^[0-9]{9}[0-9X]$/.test(value)) return [...value].reduce((sum, char, index) => sum + (char === "X" ? 10 : Number(char)) * (10 - index), 0) % 11 === 0;
  if (/^[0-9]{13}$/.test(value)) return [...value].reduce((sum, char, index) => sum + Number(char) * (index % 2 ? 3 : 1), 0) % 10 === 0;
  return false;
}
export const manualBookSchema = z.object({
  entryId: z.uuid(), title: z.string().trim().min(1).max(300), author: z.string().trim().min(1).max(200),
  isbn: z.string().trim().transform(value => value.replace(/[\s-]/g, "").toUpperCase()).refine(value => !value || validIsbn(value), "Enter a valid ISBN-10 or ISBN-13."),
  pageCount: z.number().int().min(1).max(100000).nullable(),
}).strict();
const identity = { id: z.uuid() };
export const detailMutationSchema = z.discriminatedUnion("kind", [
  z.object({ ...identity, kind: z.literal("status"), status: z.enum(["reading", "want_to_read", "dnf", "finished"]), reason: z.string().trim().max(500).optional(), useForLearning: z.boolean().optional() }).strict()
    .refine(value => value.status !== "dnf" || (Boolean(value.reason) && typeof value.useForLearning === "boolean"), "Choose why you stopped and whether Vela may use it."),
  z.object({ ...identity, kind: z.literal("review"), rating: z.number().int().min(1).max(5).nullable(), notes: z.string().max(2000), favourite: z.boolean() }).strict(),
  z.object({ ...identity, kind: z.literal("remove"), expectedUpdatedAt: z.iso.datetime({offset:true}).optional() }).strict(),
  z.object({ ...identity, kind: z.literal("restore") }).strict(),
]);
export function filterLibrary(books, { status = "all", query = "", genres = [], short = false, favourites = false, sort = "recent" } = {}) {
  const term = query.trim().toLocaleLowerCase();
  return books.filter(book => !book.isRemoved && (status === "all" || book.status === status)
    && (!term || `${book.title} ${book.author} ${(book.categories || []).join(" ")}`.toLocaleLowerCase().includes(term))
    && (!short || (book.pageCount != null && book.pageCount < 400)) && (!favourites || book.favourite)
    && (!genres.length || genres.some(genre => (book.categories || []).some(category => category.toLocaleLowerCase().includes(genre.toLocaleLowerCase())))))
    .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title) : sort === "author" ? a.author.localeCompare(b.author)
      : sort === "rating" ? (b.rating || 0) - (a.rating || 0) : b.updatedAt.localeCompare(a.updatedAt)) || a.id.localeCompare(b.id));
}
export function plainDescription(value) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}
export function readingDays(book) {
  if (!book.startedAt || !book.finishedAt) return null;
  const days = Math.floor((Date.parse(book.finishedAt) - Date.parse(book.startedAt)) / 86400000) + 1;
  return Number.isFinite(days) && days > 0 ? days : null;
}
