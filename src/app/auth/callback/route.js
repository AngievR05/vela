import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const recovery = url.searchParams.get("next") === "/reset-password";
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(new URL(recovery ? "/reset-password" : safeNext(url.searchParams.get("next")), url.origin));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    } catch {
      // Expired links and connection failures share a recoverable path.
    }
  }
  return NextResponse.redirect(new URL(recovery ? "/reset-password?error=link" : "/login?error=link", url.origin));
}
