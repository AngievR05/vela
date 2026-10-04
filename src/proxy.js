import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env/public";
import { isProtectedPath } from "@/lib/auth/redirect";

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    } }
  );
  // Validate with Auth; cookie contents alone are not authorization.
  const { data: { user }, error } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if ((!user || error) && (isProtectedPath(path) || path.startsWith("/api/"))) {
    let denied;
    if (path.startsWith("/api/")) {
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
  return response;
}

export const config = {
  matcher: ["/home/:path*", "/library/:path*", "/discover/:path*", "/dna/:path*", "/settings/:path*", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*", "/api/:path*"],
};
