import "server-only";
import { emptyPreferences, emptyPermissions, preferencesSchema } from "./reading-setup";

export async function loadReadingSetup(supabase, userId) {
  const [profile, settings] = await Promise.all([
    supabase.from("profiles").select("reading_setup_preferences, reading_setup_completed_at").eq("id", userId).single(),
    supabase.from("ai_settings").select("personalisation_enabled, use_recent_ratings, use_dnf_reasons, use_recent_history").eq("user_id", userId).single(),
  ]);
  if (profile.error || settings.error) throw new Error("We couldn’t load your reading choices. Please try again.");
  const completed = Boolean(profile.data.reading_setup_completed_at);
  const parsed = preferencesSchema.safeParse(profile.data.reading_setup_preferences);
  const enabled = completed && settings.data.personalisation_enabled;
  return {
    preferences: parsed.success ? parsed.data : emptyPreferences,
    permissions: enabled ? {
      ratings: settings.data.use_recent_ratings, dnf: settings.data.use_dnf_reasons,
      history: settings.data.use_recent_history,
    } : emptyPermissions,
    enabled, completed,
  };
}
