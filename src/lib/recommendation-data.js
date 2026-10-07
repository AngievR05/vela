import { loadHome } from "./reader-library.js";
import { eligibleCandidates, searchPlanSchema, recommendationResponseSchema, validRecommendations, bookWorkKey } from "./validation/recommendation.js";
import { plainDescription } from "./library-data.js";
const confidenceValues = { "Strong match": "strong_match", "Good match": "good_match", Experimental: "experimental" };
const confidenceLabels = { strong_match: "Strong match", good_match: "Good match", experimental: "Experimental" };
const bookColumns = "google_books_id,title,authors,description,page_count,categories,published_date,thumbnail_url,isbn";
export function mapCandidate(book) {
  return { googleBooksId: book.google_books_id, title: book.title, authors: book.authors || [], description: book.description,
    pageCount: book.page_count > 0 ? book.page_count : null, categories: book.categories || [], publishedDate: book.published_date,
    thumbnailUrl: book.thumbnail_url, isbn: book.isbn || null };
}
export async function recommendationContext(supabase, userId) {
  const home = await loadHome(supabase, userId);
  const { data: rows, error } = await supabase.from("reading_dna_signals").select("id,internal_weight").eq("user_id", userId).eq("active", true);
  if (error) throw new Error("Reader signals unavailable");
  const signals = home.signals.map(signal => ({ ...signal, weight: Number(rows.find(row => row.id === signal.id)?.internal_weight ?? 0.5) }))
    .filter(signal => signal.weight > 0).sort((a,b) => b.weight - a.weight || a.id.localeCompare(b.id)).slice(0,30)
    .map(signal => ({ ...signal, strength: signal.strength === "strong" ? "Strong" : "Emerging" }));
  return { ...home, signals };
}
export async function loadRecommendationSession(supabase, userId, sessionId = null, context = null) {
  let query = supabase.from("recommendation_sessions").select("id,request_text,filters,created_at").eq("user_id", userId).eq("status", "completed");
  query = sessionId ? query.eq("id", sessionId) : query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1);
  const session = await query.maybeSingle();
  if (session.error) throw new Error("Saved recommendations unavailable");
  if (!session.data) return null;
  const reader = context || await recommendationContext(supabase, userId);
  const results = await supabase.from("recommendations").select(`id,rank,reason,matched_signals,confidence_label,books!inner(${bookColumns}),recommendation_feedback(feedback,reason,preference_effect,corrected_signal_id,correction_action)`)
    .eq("user_id", userId).eq("session_id", session.data.id).order("rank", { ascending: true });
  if (results.error || results.data.length !== 3) throw new Error("Saved results incomplete");
  return { version: 1, userId, id: session.data.id, request: session.data.request_text, filters: session.data.filters, createdAt: session.data.created_at,
    personalisationEnabled: reader.personalisationEnabled, recommendations: results.data.map(row => ({ id: row.id, rank: row.rank, reason: row.reason,
      confidence: confidenceLabels[row.confidence_label], book: mapCandidate(row.books), feedback: Array.isArray(row.recommendation_feedback) ? row.recommendation_feedback[0] || null : row.recommendation_feedback,
      signals: reader.signals.filter(signal => row.matched_signals.includes(signal.id)),
      libraryId: reader.books.find(book => book.googleBooksId === row.books.google_books_id)?.id || null })) };
}
export async function createRecommendations(supabase, userId, input, { search, generate }) {
  const context = await recommendationContext(supabase, userId);
  const existing = await loadRecommendationSession(supabase, userId, input.entryId, context);
  if (existing) return { session: existing };
  const plan = await generate(searchPlanSchema, "Translate the current request into up to three complementary Google Books queries: one broad genre subject, one concise story/theme query, and optionally one alternative phrasing. Avoid combining every mood adjective into one restrictive AND query. The explicit request and selected filters take priority over permitted preferences; preferences are only a starting point for a broad request. Never search for an excluded theme. Return needsContext=true only when neither request, selected genre/mood nor permitted preferences provide useful direction. Do not invent titles.", { request: input.request, filters: input.filters, preferences:context.signals.map(({category,label,weight})=>({category,label,weight})) });
  if (plan.needsContext) return { state: "context" };
  const preferenceRows = await supabase.from("recommendation_feedback").select(`recommendations!inner(books!inner(${bookColumns}))`).eq("user_id", userId).eq("preference_effect", "show_less").order("updated_at", { ascending: false }).limit(30);
  if (preferenceRows.error) throw new Error("Recommendation preferences unavailable");
  const avoid = context.personalisationEnabled ? preferenceRows.data.map(row => mapCandidate(row.recommendations.books)) : [];
  const excluded = [...context.books.filter(book => book.status !== "want_to_read").map(book => book.googleBooksId), ...avoid.map(book => book.googleBooksId)];
  const excludedWorks=[...context.books.filter(book=>book.status!=="want_to_read"),...avoid].map(bookWorkKey);
  let books;
  if (input.filters.source === "tbr") books = context.books.filter(book => book.status === "want_to_read").map(book => ({ googleBooksId: book.googleBooksId, title: book.title, authors: book.author ? [book.author] : [],
    description: book.description, pageCount: book.pageCount, categories: book.categories, publishedDate: book.publishedDate, thumbnailUrl: book.coverSrc, isbn: book.isbn }));
  else {
    const searches = await Promise.allSettled([...new Set(plan.queries)].map(query => search(query,40)));
    if (searches.every(result => result.status === "rejected")) throw new Error("Book catalogue unavailable");
    const pools=searches.filter(result=>result.status==="fulfilled").map(result=>result.value);
    // Interleave queries so one query cannot consume the entire candidate budget.
    books=Array.from({length:40},(_,index)=>pools.map(pool=>pool[index]).filter(Boolean)).flat();
  }
  const clean=rows=>rows.filter(book=>/study guide|summary|workbook|journal|notebook|colouring|coloring/i.test(input.request)||!/\b(study guide|summary of|workbook|reading journal|notebook|coloring book|colouring book)\b/i.test(book.title));
  let candidates = eligibleCandidates(clean(books), input.filters, excluded,excludedWorks);
  if (candidates.length < 3 && input.filters.source === "anywhere") {
    // Catalogue queries combine words strictly; a mood-heavy phrase can miss
    // suitable books. Broaden the catalogue, then let the ranker assess fit.
    const genre = input.filters.genre || (/fantasy/i.test(input.request) ? "Fantasy" : /romance|romantic/i.test(input.request) ? "Romance" : "Fiction");
    const broader = await search(`subject:${genre === "Literary" ? "Literary Fiction" : genre}`,40);
    candidates = eligibleCandidates(clean([...books,...broader]),input.filters,excluded,excludedWorks);
  }
  if (candidates.length < 3) return { state: "no-match" };
  const selected = await generate(recommendationResponseSchema,
    "Choose exactly three distinct works from supplied candidates, or an empty array if there are not three reasonable matches. Current request, exclusions and selected filters outrank past preferences. Read descriptions carefully: match requested tone, story elements, audience and pace only when supported; a genre alone is not evidence of a trope or pacing. Avoid guides, summaries, sequels requiring prior books and repeated editions unless requested. Treat signal weights as importance, not certainty; match only supplied signal IDs supported by actual book metadata. For EACH result include bookEvidence: 1-3 exact short quotes from the supplied description, categories or title that justify its fit. Quotes must be copied verbatim. Reasons should be concise, specific and describe a relevant tradeoff or uncertainty, without inventing plot, tropes, ending or reviews. Strong match needs multiple supported aspects and substantive metadata; Good match is a plausible fit with limitations; Experimental must name its deliberate tradeoff and still satisfy explicit requirements. Reduce patterns in showLess. Never use hidden history or private notes.",
    { request: input.request, filters: input.filters, signals: context.signals.map(({id,category,label,weight,source})=>({id,category,label,weight,source})),
      showLess: avoid.map(book => ({ title: book.title, categories: book.categories, description: plainDescription(book.description).slice(0,1200) })),
      candidates: candidates.map(book => ({ id: book.googleBooksId, title: book.title, authors: book.authors, description: plainDescription(book.description).slice(0,2500), categories: book.categories, pageCount: book.pageCount })) });
  const recs = validRecommendations(selected, candidates, context.signals,true);
  if (!recs.length) return { state: "no-match" };
  // Recheck consent after generation, before recording a session based on it.
  const latest = await recommendationContext(supabase, userId);
  if (JSON.stringify(latest.signals) !== JSON.stringify(context.signals) || latest.personalisationEnabled !== context.personalisationEnabled)
    throw new Error("Reading choices changed; please retry");
  const saved = await supabase.rpc("save_recommendation_session", { session_key: input.entryId, reading_request: input.request, selected_filters: input.filters,
    allowed_signals: context.signals, candidates: candidates.map(book => book.googleBooksId), results: recs.map((rec,index) => ({ rank: index+1, reason: rec.reason,
      matchedSignals: rec.matchedSignals, confidence: confidenceValues[rec.confidence], book: candidates.find(book => book.googleBooksId === rec.bookId) })) });
  if (saved.error) throw new Error("Could not record recommendations");
  return { session: await loadRecommendationSession(supabase, userId, saved.data, latest) };
}
