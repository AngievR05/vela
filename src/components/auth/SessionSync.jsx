"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SessionSync({ userId }) {
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== userId)) {
        window.location.replace("/login");
      }
    });
    // Cookies are shared across tabs; revalidate when a tab becomes active.
    async function check() {
      if (document.visibilityState !== "visible") return;
      const { data, error } = await supabase.auth.getUser();
      if (error?.name === "AuthRetryableFetchError") return;
      if (!data.user || data.user.id !== userId) window.location.replace("/login");
    }
    document.addEventListener("visibilitychange", check);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", check);
    };
  }, [userId]);
  return null;
}
