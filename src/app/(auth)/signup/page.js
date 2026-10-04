import AuthForm from "@/components/auth/AuthForm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user && !error) redirect(safeNext(params.next));
  return <main className="page page--narrow">
    <p className="eyebrow">Account</p>
    <h1 className="heading">Create your account</h1>
    <p className="lead">Just an email and password to start your private reading space.</p>
    <div style={{ marginTop: "2rem" }}><AuthForm mode="signup" next={params.next} /></div>
    <p className="muted">Personalisation can be configured later.</p>
  </main>;
}
