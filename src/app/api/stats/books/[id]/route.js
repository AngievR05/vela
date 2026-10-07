import { z } from "zod";
import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { saveStatsRecordSchema } from "@/lib/reading-stats";

export async function PATCH(request, { params }) {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const { id } = await params;
  const parsed = saveStatsRecordSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return Response.json({ error: "Check your reading record. Your input is still here." }, { status: 400 });
  const { error } = await reader.supabase.rpc("save_reading_record", { book_entry: id, changes: parsed.data });
  if (error) return Response.json({ error: error.code === "40001" ? "This book changed while saving. Refresh before trying again." : ["PGRST202", "42883"].includes(error.code) ? "Reading record saving is awaiting database setup. Your input is still here." : "Your reading record wasn’t saved. Check the finish date and try again." }, { status: error.code === "40001" ? 409 : 503 });
  return Response.json({ saved: true }, { headers: { "Cache-Control": "private, no-store" } });
}
