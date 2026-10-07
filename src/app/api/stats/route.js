import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { loadReadingStats } from "@/lib/reading-stats-server";

export async function GET() {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  try {
    return Response.json(await loadReadingStats(reader.supabase, reader.user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Your reading stats could not load. Your Library is safe; please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
