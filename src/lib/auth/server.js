import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Verify at the data boundary as well as in Proxy. Reuse this reader-scoped
// client for future database access so PostgreSQL RLS sees the reader's JWT.
export const getReader = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user: error ? null : user, supabase };
});
