import AuthForm from "@/components/auth/AuthForm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user && !error) redirect(safeNext(params.next || "/setup"));
  return <AuthForm mode="signup" next={params.next} />;
}
