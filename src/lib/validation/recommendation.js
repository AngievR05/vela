import { z } from "zod";

export const readingSignalSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  label: z.string().min(1),
  strength: z.enum(["Strong", "Emerging"]),
  evidence: z.string().min(1),
});

export const candidateBookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  categories: z.array(z.string()).default([]),
});

export const recommendationRequestSchema = z.object({
  request: z.string().trim().min(2).max(500),
  permittedSignals: z.array(readingSignalSchema).max(30).default([]),
  candidates: z.array(candidateBookSchema).min(3).max(30),
});

export const recommendationSchema = z.object({
  bookId: z.string().min(1),
  reason: z.string().min(1).max(350),
  matchedSignals: z.array(z.string().min(1)).max(8),
  confidence: z.enum(["Strong match", "Good match", "Experimental"]),
});

export const recommendationResponseSchema = z.object({
  recommendations: z.array(recommendationSchema).length(3),
});
