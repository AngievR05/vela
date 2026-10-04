import AppShell from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { getReader } from "@/lib/auth/server";
import SessionSync from "@/components/auth/SessionSync";

export default async function AuthenticatedAppLayout({ children }) {
  const { user } = await getReader();
  if (!user) redirect("/login");
  return <AppShell><SessionSync userId={user.id} />{children}</AppShell>;
}
