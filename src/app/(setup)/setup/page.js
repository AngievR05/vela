import { redirect } from "next/navigation";
import { getReader } from "@/lib/auth/server";
import { isTransientAuthError } from "@/lib/auth/requests";
import { loadReadingSetup } from "@/lib/reading-setup-server";
import SessionSync from "@/components/auth/SessionSync";
import ReadingSetup from "@/components/setup/ReadingSetup";

export const metadata = { title: "Reading setup" };
export default async function SetupPage() {
  const { user, supabase, error } = await getReader();
  if (isTransientAuthError(error)) throw new Error("We couldn’t verify your session. Please try again.");
  if (!user) redirect("/login?next=/setup");
  const initial = await loadReadingSetup(supabase, user.id);
  return <><SessionSync userId={user.id} /><ReadingSetup key={user.id} userId={user.id} initial={initial} /></>;
}
