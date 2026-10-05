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
  return <AuthForm mode="login" next={params.next}
    initialError={params.error === "link" ? "This email link is invalid or has expired. Try logging in or request a new password reset link." : ""} />;
}
