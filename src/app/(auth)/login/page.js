import AuthForm from "@/components/auth/AuthForm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user && !error && params.error !== "link") redirect(safeNext(params.next));
  return <main className="page page--narrow">
    <p className="eyebrow">Account</p>
    <h1 className="heading">Welcome back</h1>
    <p className="lead">Log in to your private reading space.</p>
    <div style={{ marginTop: "2rem" }}><AuthForm mode="login" next={params.next} initialError={params.error === "link" ? "This email link is invalid or has expired. Try logging in or request a new password reset link." : ""} /></div>
  </main>;
}
