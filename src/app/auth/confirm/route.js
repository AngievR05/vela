import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

// Token-hash email templates also work when the email opens in another browser.
export async function GET(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const token_hash = url.searchParams.get("token_hash");
  if (token_hash && ["signup", "recovery", "email"].includes(type)) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (!error) {
        const response = NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : safeNext(url.searchParams.get("next")), url.origin));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    } catch {
      // Present recovery options without exposing tokens or provider errors.
    }
  }
  return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password?error=link" : "/login?error=link", url.origin));
}
