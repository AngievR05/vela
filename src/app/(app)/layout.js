import AppShell from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { getReader } from "@/lib/auth/server";
import SessionSync from "@/components/auth/SessionSync";
import { isTransientAuthError } from "@/lib/auth/requests";
import ReaderPreferencesRuntime from "@/components/settings/ReaderPreferencesRuntime";

export default async function AuthenticatedAppLayout({ children }) {
  const { user, error } = await getReader();
  if (isTransientAuthError(error)) throw new Error("Authentication is temporarily unavailable. Please try again.");
  if (!user) redirect("/login");
  return <AppShell><SessionSync userId={user.id} /><ReaderPreferencesRuntime userId={user.id}/>{children}</AppShell>;
}
