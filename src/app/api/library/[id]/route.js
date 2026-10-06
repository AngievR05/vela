import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { bookMutationSchema } from "@/lib/home-data";
import { mutateReaderBook } from "@/lib/home-server";

export async function PATCH(request, { params }) {
  const reader = await getReader();
  const denied = readerDeniedResponse(reader);
  if (denied) return denied;
  const { id } = await params;
  const parsed = bookMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.id !== id) return Response.json({ error: "Check the book and progress value." }, { status: 400 });
  try {
    const result = await mutateReaderBook(reader.supabase, reader.user.id, parsed.data);
    return Response.json(result.error ? { error: result.error } : { book: result.book }, {
      status: result.status || 200, headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "We couldn’t save your progress. Your input is still here; please try again." }, { status: 503 });
  }
}
