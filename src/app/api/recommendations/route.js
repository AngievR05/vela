import {
  recommendationRequestSchema,
} from "@/lib/validation/recommendation";

export async function POST(request) {
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

  // Week 5 implementation:
  // 1. Load only reader-permitted Reading DNA signals.
  // 2. Build a limited Google Books candidate set.
  // 3. Send candidates + permitted signals + current request to Gemini.
  // 4. Validate strict JSON with recommendationResponseSchema.
  // 5. Reject any book ID that is not in the supplied candidate set.
  // 6. Store results and expose explanation + feedback.

  return Response.json(
    {
      error: "Recommendation AI is scaffolded but not implemented yet.",
      nextStep: "Implement the protected Gemini server pipeline during the AI sprint.",
    },
    { status: 501 }
  );
}
