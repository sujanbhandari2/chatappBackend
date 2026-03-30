import { z } from 'zod';

export const translateBodySchema = z.object({
  text: z.string().min(1).max(100_000),
  targetLanguage: z.string().min(2).max(64),
  sourceLanguage: z.string().min(2).max(64).optional()
});

export type TranslateBody = z.infer<typeof translateBodySchema>;
