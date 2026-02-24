"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatGateway = void 0;
const zod_1 = require("zod");
const chatService = __importStar(require("../modules/chat/chat.service"));
const chat_schemas_1 = require("../modules/chat/chat.schemas");
const tenant_context_1 = require("../utils/tenant-context");
const presence_service_1 = require("../services/presence.service");
const joinConversationSchema = zod_1.z.object({
    conversationId: zod_1.z.string().uuid()
});
const roomName = (tenantId, conversationId) => `tenant:${tenantId}:conversation:${conversationId}`;
const withSocketContext = (user, socket, handler) => {
    return async (payload, ack) => {
        (0, tenant_context_1.runWithTenantContext)({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role
        }, () => {
            handler(payload, ack).catch((error) => {
                if (ack) {
                    ack({ ok: false, error: error.message });
                }
            });
        });
    };
};
const registerChatGateway = (io, socket, user) => {
    (0, presence_service_1.setUserOnline)(user.tenantId, user.userId).catch(() => undefined);
    socket.on('join_conversation', withSocketContext(user, socket, async (payload, ack) => {
        const { conversationId } = joinConversationSchema.parse(payload);
        const hasAccess = await chatService.hasConversationAccess({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role
        }, conversationId);
        if (!hasAccess) {
            throw new Error('Access denied for this conversation');
        }
        await socket.join(roomName(user.tenantId, conversationId));
        ack?.({ ok: true, data: { conversationId } });
    }));
    socket.on('send_message', withSocketContext(user, socket, async (payload, ack) => {
        const parsed = chat_schemas_1.sendMessageSchema.parse(payload);
        const message = await chatService.sendMessage({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role,
            conversationId: parsed.conversationId,
            type: parsed.type,
            content: parsed.content
        });
        io.to(roomName(user.tenantId, parsed.conversationId)).emit('message_received', message);
        ack?.({ ok: true, data: message });
    }));
    socket.on('react_to_message', withSocketContext(user, socket, async (payload, ack) => {
        const parsed = chat_schemas_1.reactToMessageSchema.parse(payload);
        const reaction = await chatService.reactToMessage({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role,
            messageId: parsed.messageId,
            reactionType: parsed.reactionType
        });
        io.to(roomName(user.tenantId, reaction.conversationId)).emit('message_reacted', reaction);
        ack?.({ ok: true, data: reaction });
    }));
    socket.on('delete_message', withSocketContext(user, socket, async (payload, ack) => {
        const parsed = chat_schemas_1.deleteMessageSchema.parse(payload);
        const deleted = await chatService.deleteMessage({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role,
            messageId: parsed.messageId
        });
        io.to(roomName(user.tenantId, deleted.conversationId)).emit('message_deleted', deleted);
        ack?.({ ok: true, data: deleted });
    }));
    socket.on('mark_as_delivered', withSocketContext(user, socket, async (payload, ack) => {
        const parsed = chat_schemas_1.markAsDeliveredSchema.parse(payload);
        const receipt = await chatService.markAsDelivered({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role,
            messageId: parsed.messageId
        });
        io.to(roomName(user.tenantId, receipt.conversationId)).emit('message_delivered', receipt);
        ack?.({ ok: true, data: receipt });
    }));
    socket.on('mark_as_read', withSocketContext(user, socket, async (payload, ack) => {
        const parsed = chat_schemas_1.markAsReadSchema.parse(payload);
        const receipt = await chatService.markAsRead({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role,
            messageId: parsed.messageId
        });
        io.to(roomName(user.tenantId, receipt.conversationId)).emit('message_read', receipt);
        ack?.({ ok: true, data: receipt });
    }));
    socket.on('disconnect', () => {
        (0, presence_service_1.setUserOffline)(user.tenantId, user.userId).catch(() => undefined);
    });
};
exports.registerChatGateway = registerChatGateway;
