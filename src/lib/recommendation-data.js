import { loadHome, allReaderRows } from "./reader-library.js";
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
  const [{ data: rows, error }, settings] = await Promise.all([supabase.from("reading_dna_signals").select("id,category,label,source_type,internal_weight,influence_state,active").eq("user_id", userId), supabase.from("ai_settings").select("use_recent_ratings,use_recent_history,use_dnf_reasons").eq("user_id",userId).single()]);
  if (settings.error) throw new Error("Reader permissions unavailable");
  if (error) throw new Error("Reader signals unavailable");
  const signals = home.signals.map(signal => ({ ...signal, weight: Number(rows.find(row => row.id === signal.id)?.internal_weight ?? 0.5) }))
    .filter(signal => signal.weight > 0).sort((a,b) => b.weight - a.weight || a.id.localeCompare(b.id)).slice(0,30)
    .map(signal => ({ ...signal, strength: signal.strength === "strong" ? "Strong" : "Emerging" }));
  const profile = await supabase.from("profiles").select("reading_dna_reset_at").eq("id",userId).single();
  if(profile.error)throw new Error("Reader reset boundary unavailable");
  let activityRows=[];
  if(home.personalisationEnabled&&(settings.data.use_recent_ratings||settings.data.use_recent_history)) {
    // The dedicated timestamps survive note edits and enforce Reset. Older databases
    // omit activity examples until the migration is applied, rather than guessing.
    const check=await supabase.from("user_books").select("id,rating_recorded_at,reading_completed_at").eq("user_id",userId).eq("is_removed",false).limit(1);
    if(check.error&&!['42703','PGRST204'].includes(check.error.code))throw new Error("Reader activity unavailable");
    if(!check.error)activityRows=await allReaderRows(supabase,"user_books","id,rating_recorded_at,reading_completed_at,updated_at",userId,{is_removed:false});
  }
  const cutoff=profile.data.reading_dna_reset_at?Date.parse(profile.data.reading_dna_reset_at):-Infinity;
  const activity=activityRows.map(row=>{
    const book=home.books.find(book=>book.id===row.id);if(!book)return null;
    const rating=settings.data.use_recent_ratings&&book.rating!=null&&Date.parse(row.rating_recorded_at)>cutoff;
    const history=settings.data.use_recent_history&&book.status==="finished"&&Date.parse(row.reading_completed_at)>cutoff;
    if(!rating&&!history)return null;
    return {at:Math.max(rating?Date.parse(row.rating_recorded_at):0,history?Date.parse(row.reading_completed_at):0),value:{title:book.title,author:book.author,categories:book.categories,description:plainDescription(book.description).slice(0,1200),...(rating?{rating:book.rating}:{}),...(history?{status:book.status}:{})}};
  }).filter(Boolean).sort((a,b)=>b.at-a.at).slice(0,20).map(row=>row.value);
  const controls = home.personalisationEnabled ? rows.filter(row => ["reduced","stopped"].includes(row.influence_state) && (["onboarding","manual","correction"].includes(row.source_type) || (row.source_type === "rating" && settings.data.use_recent_ratings) || (row.source_type === "history" && settings.data.use_recent_history) || (row.source_type === "dnf" && settings.data.use_dnf_reasons))).map(row => ({category:row.category,label:row.label,influence:row.influence_state})) : [];
  return { ...home, signals, activity, controls };
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
export async function createRecommendations(supabase, userId, input, { search, lookup, generate }) {
  const context = await recommendationContext(supabase, userId);
  const existing = await loadRecommendationSession(supabase, userId, input.entryId, context);
  if (existing) return { session: existing };
  const plan = await generate(searchPlanSchema, "Translate the current request into up to three complementary Google Books queries: one broad genre subject, one concise story/theme query, and optionally one alternative phrasing. Avoid combining every mood adjective into one restrictive AND query. The explicit request and selected filters take priority over permitted preferences; preferences are only a starting point for a broad request. Never search for an excluded theme. Return needsContext=true only when neither request, selected genre/mood nor permitted preferences provide useful direction. You may propose up to three well-known real standalone books with their authors as seedBooks to improve retrieval; these are search leads, not recommendations, and must be verified in the catalogue. For requests similar to a named book, search complementary titles rather than only editions of the named book. Do not fabricate titles. Respect Stop/Reduce controls: do not infer stopped preferences again from activity examples. A stopped trait can still be part of a new explicit request; stopping a signal is not proof of disliking a genre. Distinguish positive higher-rating patterns from lower-rating aversions; finished history is familiarity, not proof of enjoyment.", { request: input.request, filters: input.filters, controls:context.controls, approvedActivity:context.activity, preferences:context.signals.map(({category,label,weight})=>({category,label,weight})) });
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
    const seedQueries = (plan.seedBooks || []).map(book => `${book.title} ${book.author}`);
    const searches = await Promise.allSettled([...new Set([...seedQueries,...plan.queries])].map(query => search(query,40)));
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
    const attempts = await Promise.allSettled([`subject:${genre === "Literary" ? "Literary Fiction" : genre}`, genre === "Literary" ? "literary fiction" : genre].map(query => search(query,40)));
    const broader = attempts.filter(result=>result.status==="fulfilled").flatMap(result=>result.value);
    candidates = eligibleCandidates(clean([...books,...broader]),input.filters,excluded,excludedWorks);
  }
  if (candidates.length < 3) return { state: "no-match" };
  if (lookup) candidates = await Promise.all(candidates.map(async (book,index) => { if (book.description || index >= 12 || book.googleBooksId.startsWith("manual:")) return book; try { const full = await lookup(book.googleBooksId); return full?.googleBooksId === book.googleBooksId ? {...book,...full} : book; } catch { return book; } }));
  const selected = await generate(recommendationResponseSchema,
    "Choose exactly three distinct works from supplied candidates, or an empty array if there are not three reasonable matches. Current request, exclusions and selected filters outrank past preferences. Read descriptions carefully: match requested tone, story elements, audience and pace only when supported; a genre alone is not evidence of a trope or pacing. Avoid guides, summaries, sequels requiring prior books and repeated editions unless requested. Treat signal weights as importance, not certainty; match only supplied signal IDs supported by actual book metadata. For EACH result include bookEvidence: 1-3 exact short quotes from the supplied description, categories or title that justify its fit. Quotes must be copied verbatim. Reasons should be concise, specific and describe a relevant tradeoff or uncertainty, without inventing plot, tropes, ending or reviews. Strong match needs multiple supported aspects and substantive metadata; Good match is a plausible fit with limitations; Experimental must name its deliberate tradeoff and still satisfy explicit requirements. Reduce patterns in showLess. Respect Stop/Reduce controls: do not reconstruct stopped preferences from activity examples, and lower the importance of reduced traits. Explicit current requests take precedence. Higher ratings and lower ratings carry opposite directions; a finished book alone never implies liking. Compare against approvedActivity to understand the reader’s examples, but base all claims about candidates on their supplied metadata. Never use hidden history or private notes.",
    { request: input.request, filters: input.filters, controls:context.controls, approvedActivity:context.activity, signals: context.signals.map(({id,category,label,weight,source})=>({id,category,label,weight,source})),
      showLess: avoid.map(book => ({ title: book.title, categories: book.categories, description: plainDescription(book.description).slice(0,1200) })),
      candidates: candidates.map(book => ({ id: book.googleBooksId, title: book.title, authors: book.authors, description: plainDescription(book.description).slice(0,2500), categories: book.categories, pageCount: book.pageCount })) },value=>validRecommendations(value,candidates,context.signals,true));
  const recs = validRecommendations(selected, candidates, context.signals,true);
  if (!recs.length) return { state: "no-match" };
  // Recheck consent after generation, before recording a session based on it.
  const latest = await recommendationContext(supabase, userId);
  if (JSON.stringify(latest.signals) !== JSON.stringify(context.signals) || latest.personalisationEnabled !== context.personalisationEnabled || JSON.stringify(latest.activity) !== JSON.stringify(context.activity) || JSON.stringify(latest.controls) !== JSON.stringify(context.controls))
    throw new Error("Reading choices changed; please retry");
  const saved = await supabase.rpc("save_recommendation_session", { session_key: input.entryId, reading_request: input.request, selected_filters: input.filters,
    allowed_signals: context.signals, candidates: candidates.map(book => book.googleBooksId), results: recs.map((rec,index) => ({ rank: index+1, reason: rec.reason,
      matchedSignals: rec.matchedSignals, confidence: confidenceValues[rec.confidence], book: candidates.find(book => book.googleBooksId === rec.bookId) })) });
  if (saved.error) { console.warn("Recommendation save rejected:", saved.error.code); throw new Error("Could not record recommendations"); }
  return { session: await loadRecommendationSession(supabase, userId, saved.data, latest) };
}
