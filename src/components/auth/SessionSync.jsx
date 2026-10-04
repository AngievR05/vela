"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isTransientAuthError, sessionNeedsLogin } from "@/lib/auth/requests";

export default function SessionSync({ userId }) {
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let checking = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && sessionNeedsLogin(userId, event, session)) {
        window.location.replace("/login");
      }
    });
    // Cookies are shared across tabs; revalidate when a tab becomes active.
    async function check() {
      if (!active || checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (isTransientAuthError(error)) return;
        if (active && (!data?.user || data.user.id !== userId)) window.location.replace("/login");
      } catch {
        // A temporary transport failure should not discard the current page.
      } finally {
        checking = false;
      }
    }
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      active = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [userId]);
  return null;
}
