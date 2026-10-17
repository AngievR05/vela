import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().default(""),
  GOOGLE_BOOKS_API_KEY: z.string().default(""),
});

export const serverEnv = serverEnvSchema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_BOOKS_API_KEY: process.env.GOOGLE_BOOKS_API_KEY,
});
