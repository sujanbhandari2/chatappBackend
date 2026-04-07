import { z } from 'zod';

const nameSchema = z.string().min(1).max(120);
const emailSchema = z.string().email();

export const registerSchema = z.object({
  /** Omit to use the default (first) tenant; any non-empty string is stored as tenant id (e.g. slug `"one"`). */
  tenantId: z.string().min(1).max(128).optional(),
  name: nameSchema,
  email: emailSchema,
  status: z.string().min(1).max(64).optional()
});

export const loginSchema = z.object({
  tenantId: z.string().min(1).max(128),
  email: emailSchema
});
