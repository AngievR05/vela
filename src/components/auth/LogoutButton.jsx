"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.replace("/login");
    } catch {
      setError("We could not log you out. Please try again.");
      setPending(false);
    }
  }
  return <><Button onClick={logout} loading={pending} variant="secondary">Log out</Button>{error && <p role="alert">{error}</p>}</>;
}
