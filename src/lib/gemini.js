/**
 * Gemini integration belongs only in server code.
 *
 * During the AI sprint this module should:
 * - accept the current reading request
 * - accept only permitted Reading DNA signals
 * - accept a limited Google Books candidate set
 * - request strict JSON
 * - return exactly three candidate IDs
 * - never allow a title outside the supplied candidate set
 *
 * Do not expose GEMINI_API_KEY to client components.
 */

export function requireGeminiKey() {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return key;
}
