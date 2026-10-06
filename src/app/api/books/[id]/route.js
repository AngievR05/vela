import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { getGoogleBook } from "@/lib/google-books";
import { z } from "zod";
export async function GET(request, { params }) {
  const denied = readerDeniedResponse(await getReader());
  if (denied) return denied;
  const { id } = await params;
  if (!z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).safeParse(id).success) return Response.json({ error: "Book not found." }, { status: 404 });
  try {
    const book = await getGoogleBook(id);
    return Response.json(book ? { book } : { error: "Book not found." }, { status: book ? 200 : 404, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "We couldn’t load this book. Your search is still here; please try again." }, { status: 503 });
  }
}
