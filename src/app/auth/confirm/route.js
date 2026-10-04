import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";
import { isTransientAuthError } from "@/lib/auth/requests";
import { authUnavailableResponse } from "@/lib/auth/http";

// Token-hash email templates also work when the email opens in another browser.
export async function GET(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const token_hash = url.searchParams.get("token_hash");
  if (token_hash && ["signup", "recovery", "email"].includes(type)) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (isTransientAuthError(error)) return authUnavailableResponse();
      if (!error) {
        const response = NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : safeNext(url.searchParams.get("next")), url.origin));
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("Expires", "0");
        response.headers.set("Pragma", "no-cache");
        return response;
      }
    } catch (error) {
      if (isTransientAuthError(error) || error instanceof TypeError) return authUnavailableResponse();
    }
  }
  return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password?error=link" : "/login?error=link", url.origin));
}
