import { z } from 'zod';

export const createConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1)
});

export const createDirectConversationSchema = z.object({
  userId: z.string().uuid()
});

export const createGroupConversationSchema = z.object({
  title: z.string().min(1).max(120),
  participantIds: z.array(z.string().uuid()).min(2)
});

export const conversationParamsSchema = z.object({
  id: z.string().uuid()
});

export const messagePaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['TEXT', 'IMAGE', 'VOICE']),
  content: z.string().min(1).max(5000),
  replyToMessageId: z.string().uuid().optional()
});

export const deleteMessageSchema = z.object({
  messageId: z.string().uuid()
});

export const markAsReadSchema = z.object({
  messageId: z.string().uuid()
});

export const markAsDeliveredSchema = z.object({
  messageId: z.string().uuid()
});

export const addReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(32)
});

export const removeReactionSchema = addReactionSchema;
