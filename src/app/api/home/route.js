import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { loadHome } from "@/lib/home-server";

export async function GET() {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  try {
    return Response.json(await loadHome(reader.supabase, reader.user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Home could not refresh. Your Library is safe; please try again." }, { status: 503 });
  }
}
