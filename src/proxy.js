import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env/public";
import { isProtectedPath } from "@/lib/auth/redirect";
import { isTransientAuthError } from "@/lib/auth/requests";

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers = {}) {
        const previousCookies = response.cookies.getAll();
        const previousHeaders = new Headers(response.headers);
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        for (const key of ["Cache-Control", "Expires", "Pragma"]) {
          const value = headers[key] ?? previousHeaders.get(key);
          if (value) response.headers.set(key, value);
        }
      },
    } }
  );
  // Validate with Auth; cookie contents alone are not authorization.
  const { data: { user }, error } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if ((!user || error) && (isProtectedPath(path) || path.startsWith("/api/"))) {
    let denied;
    if (isTransientAuthError(error)) {
      denied = path.startsWith("/api/")
        ? NextResponse.json({ error: "Authentication is temporarily unavailable. Please try again." }, { status: 503 })
        : new NextResponse("We could not verify your session. Check your connection and reload this page to try again.", {
          status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      denied.headers.set("Retry-After", "5");
    } else if (path.startsWith("/api/")) {
      denied = NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", `${path}${request.nextUrl.search}`);
      denied = NextResponse.redirect(url);
    }
    response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
    response = denied;
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const config = {
  matcher: ["/", "/welcome", "/home/:path*", "/stats/:path*", "/library/:path*", "/discover/:path*", "/dna/:path*", "/settings/:path*", "/setup/:path*", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*", "/api/:path*"],
};
