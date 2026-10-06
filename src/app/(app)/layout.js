import AppShell from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { getReader } from "@/lib/auth/server";
import SessionSync from "@/components/auth/SessionSync";
import { isTransientAuthError } from "@/lib/auth/requests";
import ReaderPreferencesRuntime from "@/components/settings/ReaderPreferencesRuntime";
import {loadReaderSettings,defaultReaderPreferences} from "@/lib/reader-settings";

export default async function AuthenticatedAppLayout({ children }) {
  const { user, error, supabase } = await getReader();
  if (isTransientAuthError(error)) throw new Error("Authentication is temporarily unavailable. Please try again.");
  if (!user) redirect("/login");
  let preferences=defaultReaderPreferences;
  try{preferences=(await loadReaderSettings(supabase,user)).preferences;}catch{/* Settings remain retryable during deployment or an outage. */}
  return <AppShell><SessionSync userId={user.id} /><ReaderPreferencesRuntime userId={user.id} initial={preferences}/>{children}</AppShell>;
}
