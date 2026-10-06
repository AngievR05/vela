import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { feedbackSchema } from "@/lib/validation/recommendation";
import { recommendationContext, loadRecommendationSession } from "@/lib/recommendation-data";
import { z } from "zod";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request, { params }) {
  const reader = await getReader(), denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const { id } = await params;
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return Response.json({ error: "Check your feedback. Your selection is still here." }, { status: 400, headers });
  try {
    const rec = await reader.supabase.from("recommendations").select("session_id,matched_signals").eq("id", id).eq("user_id", reader.user.id).maybeSingle();
    if (rec.error) throw new Error("Recommendation unavailable");
    if (!rec.data) return Response.json({ error: "Recommendation not found." }, { status: 404, headers });
    const value = parsed.data;
    const context = await recommendationContext(reader.supabase, reader.user.id);
    if (value.action === "show_less" && !context.personalisationEnabled) return Response.json({ error: "Enable personalisation in your data choices before saving a future preference." }, { status: 409, headers });
    if (value.action === "correct" && (!rec.data.matched_signals.includes(value.signalId) || !context.signals.some(signal => signal.id === value.signalId)))
      return Response.json({ error: "This signal has changed or is no longer permitted. Refresh before editing." }, { status: 409, headers });
    const saved = await reader.supabase.rpc("record_recommendation_feedback", { recommendation_key: id, action: value.action, feedback_reason: value.reason || null,
      signal_key: value.signalId || null, signal_action: value.correction || null });
    if (saved.error) throw new Error("Feedback save failed");
    return Response.json({ session: await loadRecommendationSession(reader.supabase, reader.user.id, rec.data.session_id) }, { headers });
  } catch {
    return Response.json({ error: "We couldn’t confirm your feedback. Your selection is still here; please try again." }, { status: 503, headers });
  }
}
