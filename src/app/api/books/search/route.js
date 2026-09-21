import { z } from "zod";
import { searchGoogleBooks } from "@/lib/google-books";

const searchSchema = z.object({
  q: z.string().trim().min(2, "Search must contain at least two characters."),
  maxResults: z.coerce.number().int().min(1).max(20).default(10),
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const parsed = searchSchema.safeParse({
    q: searchParams.get("q"),
    maxResults: searchParams.get("maxResults") ?? 10,
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid search request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const books = await searchGoogleBooks(
      parsed.data.q,
      parsed.data.maxResults
    );

    return Response.json({ books });
  } catch (error) {
    console.error("Google Books search failed:", error);

    return Response.json(
      { error: "Book search is temporarily unavailable." },
      { status: 502 }
    );
  }
}
