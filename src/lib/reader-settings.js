import { z } from "zod";
export const defaultReaderPreferences = { theme: "system", density: "comfortable", textScale: "system", reduceMotion: false, highContrast: false, haptics: false, reminders: false, digest: false, nudges: false, reminderTime: "19:00" };
export const readerPreferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]), density: z.enum(["comfortable", "compact"]), textScale: z.enum(["system", "large"]),
  reduceMotion: z.boolean(), highContrast: z.boolean(), haptics: z.boolean(), reminders: z.boolean(), digest: z.boolean(), nudges: z.boolean(), reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).strict();
export const settingsMutationSchema = z.discriminatedUnion("kind", [
  z.object({kind:z.literal("preferences"), preferences:readerPreferencesSchema}).strict(),
  z.object({kind:z.literal("permissions"), enabled:z.boolean(), ratings:z.boolean(), history:z.boolean(), dnf:z.boolean()}).strict().refine(value=>value.enabled||!(value.ratings||value.history||value.dnf),"Optional signals must be off when personalisation is off."),
  z.object({kind:z.literal("profile"), name:z.string().trim().min(1).max(60)}).strict(),
  z.object({kind:z.literal("reset"), confirmation:z.literal("RESET")}).strict(),
]);
export function settingsCacheKey(userId) { return `vela:settings:v1:${userId}`; }
export async function loadReaderSettings(supabase, user) {
  const [profile, settings] = await Promise.all([
    supabase.from("profiles").select("display_name,created_at,reader_preferences").eq("id",user.id).single(),
    supabase.from("ai_settings").select("personalisation_enabled,use_recent_ratings,use_recent_history,use_dnf_reasons").eq("user_id",user.id).single(),
  ]);
  if(profile.error||settings.error)throw new Error("Your settings could not load. Please try again.");
  const preferences=readerPreferencesSchema.safeParse(profile.data.reader_preferences);
  return {userId:user.id,name:profile.data.display_name,email:user.email||"",pendingEmail:user.new_email||null,createdAt:profile.data.created_at,preferences:preferences.success?preferences.data:defaultReaderPreferences,
    permissions:{enabled:settings.data.personalisation_enabled,ratings:settings.data.use_recent_ratings,history:settings.data.use_recent_history,dnf:settings.data.use_dnf_reasons}};
}
