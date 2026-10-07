import { z } from "zod";

export const initialSetupChoices = {
  genres: ["Fantasy", "Science fiction", "Mystery", "Romance", "Literary fiction", "Historical", "Horror", "Non-fiction"],
  storyElements: ["Character-led", "Found family", "Slow burn", "Political intrigue", "Mystery", "High stakes", "Humour", "Quiet reflection"],
  pacing: ["Slow and immersive", "Steady", "Fast start", "Relentless"],
  moods: ["Reflective", "Comforting", "Adventurous", "Dark", "Hopeful", "Easy to resume"],
};
export const setupChoices = {
 genres: [...initialSetupChoices.genres, "Thriller", "Crime", "Contemporary", "Classics", "Young adult", "Graphic novels", "Memoir", "Biography", "History", "Science", "Philosophy", "Poetry", "Self-development"],
 storyElements: [...initialSetupChoices.storyElements, "Enemies to lovers", "Friends to lovers", "Second chance", "Coming of age", "Chosen one", "World-building", "Unreliable narrator", "Plot twists", "Epic quests", "Forbidden romance", "Morally grey characters", "Multiple perspectives"],
 pacing: [...initialSetupChoices.pacing, "Gradually builds", "Short chapters", "Unhurried"],
 moods: [...initialSetupChoices.moods, "Emotional", "Funny", "Suspenseful", "Romantic", "Atmospheric", "Thought-provoking", "Uplifting", "Bittersweet", "Escapist"],
};
const selections = (key) => z.array(z.enum(setupChoices[key])).max(setupChoices[key].length)
  .refine((values) => new Set(values).size === values.length, "Choose each option once.");
export const preferencesSchema = z.object({
  genres: selections("genres"), storyElements: selections("storyElements"),
  pacing: z.union([z.literal(""), z.enum(setupChoices.pacing)]), moods: selections("moods"),
}).strict();
export const permissionsSchema = z.object({
  ratings: z.boolean(), dnf: z.boolean(), history: z.boolean(),
}).strict();
export const readingSetupSchema = z.object({
  preferences: preferencesSchema, permissions: permissionsSchema, enabled: z.boolean(),
}).strict().refine((value) => value.enabled || !Object.values(value.permissions).some(Boolean),
  "Optional signals must be off when personalisation is off.");
export const emptyPreferences = { genres: [], storyElements: [], pacing: "", moods: [] };
export const emptyPermissions = { ratings: false, dnf: false, history: false };

export function draftKey(userId) { return `vela:reading-setup:v1:${userId}`; }
export function parseDraft(value) {
  try {
    const data = JSON.parse(value);
    const parsed = readingSetupSchema.safeParse(data?.version === 2 ? data.payload : data);
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export function parseDraftFlow(value) {
  try {
    const data = JSON.parse(value);
    const stages = [0, 1, 2, 3, "intro", "ai", "permissions", "review", "skip"];
    if (data?.version !== 2 || !parseDraft(value) || !stages.includes(data.stage) || typeof data.editing !== "boolean") return null;
    return { stage: data.stage, editing: data.editing };
  } catch { return null; }
}
