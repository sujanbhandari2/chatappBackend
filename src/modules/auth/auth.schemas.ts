import { z } from 'zod';

const nameSchema = z.string().min(1).max(120);
const emailSchema = z.string().email();
const statusSchema = z.string().min(1).max(64).default('ACTIVE');

export const registerSchema = z.object({
  tenantId: z.string().uuid().optional(),
  name: nameSchema,
  email: emailSchema,
  status: statusSchema.optional()
});

export const loginSchema = z.object({
  tenantId: z.string().uuid(),
  email: emailSchema
});
