import "server-only";
import { serverEnv } from "@/lib/env/server";
import { requestGemini } from "./gemini-request.js";
import {assertFreeGemini} from "./provider-policy.js";

export function getGeminiApiKey() {
  return serverEnv.GEMINI_API_KEY;
}

export async function generateStructured(schema, instruction, data, validate) {
  const model=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite",fallbackModel=process.env.GEMINI_FALLBACK_MODEL||"gemini-3.1-flash-lite";
  assertFreeGemini({verified:process.env.GEMINI_FREE_TIER_VERIFIED==="true",enabled:process.env.GEMINI_ENABLED!=="false",model,fallbackModel});
  return requestGemini(schema, instruction, data, { apiKey: getGeminiApiKey(), model, fallbackModel, validate });
}
