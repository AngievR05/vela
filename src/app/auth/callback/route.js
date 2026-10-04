import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";
import { isTransientAuthError } from "@/lib/auth/requests";
import { authUnavailableResponse } from "@/lib/auth/http";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const recovery = url.searchParams.get("next") === "/reset-password";
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (isTransientAuthError(error)) return authUnavailableResponse();
      if (!error) {
        const response = NextResponse.redirect(new URL(recovery ? "/reset-password" : safeNext(url.searchParams.get("next")), url.origin));
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("Expires", "0");
        response.headers.set("Pragma", "no-cache");
        return response;
      }
    } catch (error) {
      if (isTransientAuthError(error) || error instanceof TypeError) return authUnavailableResponse();
    }
  }
  return NextResponse.redirect(new URL(recovery ? "/reset-password?error=link" : "/login?error=link", url.origin));
}
