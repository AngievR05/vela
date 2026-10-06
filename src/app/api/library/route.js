import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { addBookSchema } from "@/lib/home-data";
import { getGoogleBook } from "@/lib/google-books";
import { saveLibraryBook } from "@/lib/home-server";

export async function POST(request) {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const parsed = addBookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a book from the search results." }, { status: 400 });
  try {
    const result = await saveLibraryBook(reader.supabase, reader.user.id, parsed.data.googleBooksId, getGoogleBook, parsed.data.status);
    return Response.json(result, { status: result.status || 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "We couldn’t add this book. Your search is still here; please try again." }, { status: 503 });
  }
}
