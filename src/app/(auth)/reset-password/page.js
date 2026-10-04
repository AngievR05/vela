import Link from "next/link";
import AuthForm from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/server";
import { isTransientAuthError } from "@/lib/auth/requests";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return <main className="page page--narrow">
    <p className="eyebrow">Account</p>
    <h1 className="heading">Choose a new password</h1>
    <div style={{ marginTop: "2rem" }}>
      {user && !error && params.error !== "link" ? <AuthForm mode="reset" /> : <>
        {isTransientAuthError(error) && params.error !== "link" ? <>
          <p role="alert">We could not verify your reset link. Check your connection and reload this page to try again.</p>
          <a href="/reset-password">Try again</a>
        </> : <>
          <p role="alert">Your reset link is invalid or has expired.</p>
          <Link href="/forgot-password">Request a new reset link</Link>
        </>}
      </>}
    </div>
  </main>;
}
