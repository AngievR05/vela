import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { readingSetupSchema } from "@/lib/reading-setup";
import { loadReadingSetup } from "@/lib/reading-setup-server";

export async function GET() {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  try {
    return Response.json(await loadReadingSetup(reader.supabase, reader.user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "We couldn’t load your choices. Please try again." }, { status: 503 });
  }
}

export async function PUT(request) {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const parsed = readingSetupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check your reading choices and try again." }, { status: 400 });
  try {
    const { error } = await reader.supabase.rpc("save_reading_setup", {
      choices: parsed.data.preferences, permissions: parsed.data.permissions, enabled: parsed.data.enabled,
    });
    if (error) return Response.json({ error: "Your setup wasn’t saved. Your choices are still here; please try again." }, { status: 503 });
    return Response.json({ saved: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "We couldn’t connect. Your choices are still here; please try again." }, { status: 503 });
  }
}
