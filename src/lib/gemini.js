import "server-only";
import { serverEnv } from "@/lib/env/server";
import { requestGemini } from "./gemini-request.js";

export function getGeminiApiKey() {
  return serverEnv.GEMINI_API_KEY;
}

export async function generateStructured(schema, instruction, data, validate) {
  return requestGemini(schema, instruction, data, { apiKey: getGeminiApiKey(), model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite", validate });
}
