import { recommendationRequestSchema } from "@/lib/validation/recommendation";
import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { createRecommendations, loadRecommendationSession } from "@/lib/recommendation-data";
import { searchGoogleBooks, getGoogleBook } from "@/lib/google-books";
import { generateStructured } from "@/lib/gemini";
import { z } from "zod";
const headers = { "Cache-Control": "private, no-store" };
export const maxDuration = 180;

export async function GET(request) {
  const reader = await getReader(), denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("session");
  if (id && !z.uuid().safeParse(id).success) return Response.json({ error: "Session not found." }, { status: 404, headers });
  try { return Response.json({ session: await loadRecommendationSession(reader.supabase, reader.user.id, id) }, { headers }); }
  catch { return Response.json({ error: "Saved recommendations could not refresh. Please try again." }, { status: 503, headers }); }
}

export async function POST(request) {
  const reader = await getReader(), denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const parsed = recommendationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid recommendation request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    return Response.json(await createRecommendations(reader.supabase, reader.user.id, parsed.data, { search: searchGoogleBooks, lookup: getGoogleBook, generate: generateStructured }), { headers });
  } catch (error) {
    console.warn("Recommendation request failed:", error.name === "ZodError" ? "Generated output validation failed" : error.message);
    return Response.json({ error: "Recommendations are temporarily unavailable. Your request is still here; please try again." }, { status: 503, headers });
  }
}
