import "server-only";
import { serverEnv } from "@/lib/env/server";

export function getGeminiApiKey() {
  return serverEnv.GEMINI_API_KEY;
}
