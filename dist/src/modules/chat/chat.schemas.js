"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsDeliveredSchema = exports.markAsReadSchema = exports.deleteMessageSchema = exports.reactToMessageSchema = exports.sendMessageSchema = exports.messagePaginationQuerySchema = exports.conversationParamsSchema = exports.createConversationSchema = void 0;
const zod_1 = require("zod");
exports.createConversationSchema = zod_1.z.object({
    participantIds: zod_1.z.array(zod_1.z.string().uuid()).min(1)
});
exports.conversationParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
exports.messagePaginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20)
});
exports.sendMessageSchema = zod_1.z.object({
    conversationId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['TEXT', 'IMAGE', 'VOICE']),
    content: zod_1.z.string().min(1).max(5000)
});
exports.reactToMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string().uuid(),
    reactionType: zod_1.z.string().min(1).max(32)
});
exports.deleteMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string().uuid()
});
exports.markAsReadSchema = zod_1.z.object({
    messageId: zod_1.z.string().uuid()
});
exports.markAsDeliveredSchema = zod_1.z.object({
    messageId: zod_1.z.string().uuid()
});
