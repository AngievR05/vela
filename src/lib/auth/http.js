import { isTransientAuthError } from "./requests.js";

export function readerDeniedResponse({ user, error }) {
  if (user && !error) return null;
  const temporary = isTransientAuthError(error);
  return Response.json({ error: temporary
    ? "Authentication is temporarily unavailable. Please try again."
    : "Please log in to continue." }, {
    status: temporary ? 503 : 401,
    headers: {
      "Cache-Control": "private, no-store", "Expires": "0", "Pragma": "no-cache",
      ...(temporary ? { "Retry-After": "5" } : {}),
    },
  });
}

export function authUnavailableResponse() {
  return new Response("We could not verify your email link. Check your connection and reload this page to try again.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Expires": "0",
      "Pragma": "no-cache",
      "Retry-After": "5",
    },
  });
}
