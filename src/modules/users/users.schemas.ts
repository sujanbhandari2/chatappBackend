import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
  deviceId: z.string().min(1).max(255).optional()
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().min(20).max(4096)
});

export const testPushSchema = z.object({
  message: z.string().min(1).max(120).default('Test push notification from HealthChat')
});
