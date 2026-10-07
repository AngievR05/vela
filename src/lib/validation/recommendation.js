import { z } from "zod";

export const discoveryFiltersSchema = z.object({
  source: z.enum(["anywhere", "tbr"]).default("anywhere"), genre: z.enum(["", "Fantasy", "Romance", "Literary"]).default(""),
  mood: z.enum(["", "Emotional", "Hopeful", "Dark"]).default(""), length: z.enum(["any", "300", "500"]).default("any"),
}).strict();
export const recommendationRequestSchema = z.object({
  entryId: z.uuid(), request: z.string().trim().min(2).max(240),
  filters: discoveryFiltersSchema.default({ source: "anywhere", genre: "", mood: "", length: "any" }),
}).strict();
export const searchPlanSchema = z.object({ needsContext: z.boolean(), queries: z.array(z.string().trim().min(2).max(120)).min(1).max(3) }).strict();
export const recommendationResponseSchema = z.object({
  recommendations: z.array(z.object({ bookId: z.string().min(1).max(100), reason: z.string().trim().min(1).max(350),
    matchedSignals: z.array(z.uuid()).max(8), confidence: z.enum(["Strong match", "Good match", "Experimental"]),
    bookEvidence: z.array(z.string().trim().min(3).max(300)).min(1).max(3).optional(),
  }).strict()).max(3),
}).strict();
export const feedbackSchema = z.object({ action: z.enum(["helpful", "not_for_me", "show_less", "undo_less", "correct"]),
  reason: z.string().trim().max(250).optional(), signalId: z.uuid().optional(), correction: z.enum(["keep", "reduce", "remove"]).optional(),
}).strict().refine(value => value.action !== "correct" || (value.signalId && value.correction), "Choose a signal and correction.")
  .refine(value => value.action !== "not_for_me" || Boolean(value.reason), "Choose what missed the mark.");
export const discoveryCacheKey = userId => `vela:discover:v1:${userId}`;
export const discoveryDraftKey = userId => `vela:discover-draft:v1:${userId}`;
export const recommendationSessionSchema = z.object({ version: z.literal(1), userId: z.uuid(), id: z.uuid(), request: z.string(), filters: discoveryFiltersSchema,
  createdAt: z.string(), personalisationEnabled: z.boolean(), recommendations: z.array(z.object({ id: z.uuid(), rank: z.number().int().min(1).max(3), reason: z.string(),
    confidence: z.enum(["Strong match", "Good match", "Experimental"]), libraryId: z.uuid().nullable(),
    book: z.object({ googleBooksId: z.string(), title: z.string().min(1), authors: z.array(z.string()), description: z.string().nullable(), pageCount: z.number().int().positive().nullable(),
      categories: z.array(z.string()), publishedDate: z.string().nullable(), thumbnailUrl: z.string().nullable(), isbn: z.string().nullable() }),
    feedback: z.object({ feedback: z.enum(["helpful", "not_for_me"]), reason: z.string().nullable(), preference_effect: z.enum(["show_less"]).nullable(),
      corrected_signal_id: z.uuid().nullable(), correction_action: z.enum(["keep", "reduce", "remove"]).nullable() }).nullable(),
    signals: z.array(z.object({ id: z.uuid(), label: z.string(), category: z.string(), source: z.string(), strength: z.enum(["Strong", "Emerging"]), weight: z.number(),
      evidence: z.array(z.object({ id: z.uuid(), title: z.string() })) })),
  })).length(3),
});
export function parseRecommendationSession(value, userId) {
  const parsed = recommendationSessionSchema.safeParse(value);
  return parsed.success && parsed.data.userId === userId ? parsed.data : null;
}
const normalise = value => String(value || "").normalize("NFKD").toLowerCase().replace(/<[^>]*>/g," ").replace(/&(?:nbsp|amp|quot|#39);/g," ").replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function bookWorkKey(book) {
  const title=normalise(book.title?.replace(/\s*\((?:[^)]*edition|[^)]*paperback|[^)]*hardback)\)\s*$/i,""));
  const author=normalise(book.authors?.[0] || book.author);
  return title && author ? `${title}|${author}` : `volume:${book.googleBooksId}`;
}
export function validRecommendations(value, candidates, signals, requireEvidence = false) {
  const parsed = recommendationResponseSchema.parse(value);
  const ids = new Set(candidates.map(book => book.googleBooksId)), signalIds = new Set(signals.map(signal => signal.id));
  if (parsed.recommendations.length !== 0 && parsed.recommendations.length !== 3) throw new Error("Expected three recommendations");
  if (new Set(parsed.recommendations.map(book => book.bookId)).size !== parsed.recommendations.length) throw new Error("Duplicate recommendations");
  for (const rec of parsed.recommendations) if (!ids.has(rec.bookId) || rec.matchedSignals.some(id => !signalIds.has(id))) throw new Error("Unverified recommendation evidence");
  if(new Set(parsed.recommendations.map(rec=>bookWorkKey(candidates.find(book=>book.googleBooksId===rec.bookId)))).size!==parsed.recommendations.length)
    throw new Error("Different editions of the same book");
  for(const rec of parsed.recommendations){
    const book=candidates.find(book=>book.googleBooksId===rec.bookId);
    const facts=[book.title,...(book.authors||[]),...(book.categories||[]),book.description].filter(Boolean).map(normalise);
    if(requireEvidence&&!rec.bookEvidence?.length)throw new Error("Book evidence missing");
    if(rec.bookEvidence?.some(quote=>!facts.some(fact=>fact.includes(normalise(quote)))))throw new Error("Unsupported book evidence");
    rec.matchedSignals=[...new Set(rec.matchedSignals)];
    if(rec.confidence==="Strong match"&&(!book.description||!book.authors?.length||new Set(rec.bookEvidence?.map(normalise)).size<2))rec.confidence="Good match";
  }
  return parsed.recommendations;
}
export function eligibleCandidates(books, filters, excluded = [], excludedWorks = []) {
  return [...new Map(books.filter(book => book.googleBooksId && book.title && !excluded.includes(book.googleBooksId) && !excludedWorks.includes(bookWorkKey(book))
    && (filters.length === "any" || (book.pageCount > 0 && book.pageCount < Number(filters.length)))
    && (!filters.genre || (book.categories||[]).some(category => filters.genre === "Literary" ? /literary/i.test(category) : category.toLowerCase().includes(filters.genre.toLowerCase())) || (filters.genre==="Literary"&&/literary/i.test(book.description||""))))
    .map(book => [bookWorkKey(book), book])).values()].slice(0, 60);
}
