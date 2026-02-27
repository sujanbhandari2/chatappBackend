import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import * as chatService from '../modules/chat/chat.service';
import {
  addReactionSchema,
  markAsDeliveredSchema,
  deleteMessageSchema,
  markAsReadSchema,
  removeReactionSchema,
  sendMessageSchema
} from '../modules/chat/chat.schemas';
import { runWithTenantContext } from '../utils/tenant-context';
import { SocketUserContext } from './socket-auth';
import { setUserOffline, setUserOnline } from '../services/presence.service';

const joinConversationSchema = z.object({
  conversationId: z.string().uuid()
});

type Ack = (response: { ok: boolean; data?: unknown; error?: string }) => void;

const roomName = (tenantId: string, conversationId: string): string => `tenant:${tenantId}:conversation:${conversationId}`;

const withSocketContext = (
  user: SocketUserContext,
  socket: Socket,
  handler: (payload: unknown, ack?: Ack) => Promise<void>
) => {
  return async (payload: unknown, ack?: Ack): Promise<void> => {
    runWithTenantContext(
      {
        tenantId: user.tenantId,
        userId: user.userId
      },
      () => {
        handler(payload, ack).catch((error: Error) => {
          if (ack) {
            ack({ ok: false, error: error.message });
          }
        });
      }
    );
  };
};

export const registerChatGateway = (io: Server, socket: Socket, user: SocketUserContext): void => {
  setUserOnline(user.tenantId, user.userId).catch(() => undefined);

  socket.on(
    'join_conversation',
    withSocketContext(user, socket, async (payload, ack) => {
      const { conversationId } = joinConversationSchema.parse(payload);

      const hasAccess = await chatService.hasConversationAccess(
        {
          tenantId: user.tenantId,
          userId: user.userId
        },
        conversationId
      );

      if (!hasAccess) {
        throw new Error('Access denied for this conversation');
      }

      await socket.join(roomName(user.tenantId, conversationId));
      ack?.({ ok: true, data: { conversationId } });
    })
  );

  socket.on(
    'send_message',
    withSocketContext(user, socket, async (payload, ack) => {
      const parsed = sendMessageSchema.parse(payload) as {
        conversationId: string;
        type: 'TEXT' | 'IMAGE' | 'VOICE';
        content: string;
        replyToMessageId?: string;
      };

      const message = await chatService.sendMessage({
        tenantId: user.tenantId,
        userId: user.userId,
        conversationId: parsed.conversationId,
        type: parsed.type,
        content: parsed.content,
        replyToMessageId: parsed.replyToMessageId
      });

      io.to(roomName(user.tenantId, parsed.conversationId)).emit('message_received', message);
      ack?.({ ok: true, data: message });
    })
  );

  socket.on(
    'delete_message',
    withSocketContext(user, socket, async (payload, ack) => {
      const parsed = deleteMessageSchema.parse(payload);
      const deleted = await chatService.deleteMessage({
        tenantId: user.tenantId,
        userId: user.userId,
        messageId: parsed.messageId
      });

      io.to(roomName(user.tenantId, deleted.conversationId)).emit('message_deleted', deleted);
      ack?.({ ok: true, data: deleted });
    })
  );

  socket.on(
    'add_reaction',
    withSocketContext(user, socket, async (payload, ack) => {
      const parsed = addReactionSchema.parse(payload);
      const reactionState = await chatService.addReaction({
        tenantId: user.tenantId,
        userId: user.userId,
        messageId: parsed.messageId,
        emoji: parsed.emoji
      });

      io.to(roomName(user.tenantId, reactionState.conversationId)).emit('reaction_updated', reactionState);
      ack?.({ ok: true, data: reactionState });
    })
  );

  socket.on(
    'remove_reaction',
    withSocketContext(user, socket, async (payload, ack) => {
      const parsed = removeReactionSchema.parse(payload);
      const reactionState = await chatService.removeReaction({
        tenantId: user.tenantId,
        userId: user.userId,
        messageId: parsed.messageId,
        emoji: parsed.emoji
      });

      io.to(roomName(user.tenantId, reactionState.conversationId)).emit('reaction_updated', reactionState);
      ack?.({ ok: true, data: reactionState });
    })
  );

  socket.on(
    'mark_as_delivered',
    withSocketContext(user, socket, async (payload, ack) => {
      const parsed = markAsDeliveredSchema.parse(payload);
      const receipt = await chatService.markAsDelivered({
        tenantId: user.tenantId,
        userId: user.userId,
        messageId: parsed.messageId
      });

      io.to(roomName(user.tenantId, receipt.conversationId)).emit('message_delivered', receipt);
      ack?.({ ok: true, data: receipt });
    })
  );

  socket.on(
    'mark_as_read',
    withSocketContext(user, socket, async (payload, ack) => {
      const parsed = markAsReadSchema.parse(payload);
      const receipt = await chatService.markAsRead({
        tenantId: user.tenantId,
        userId: user.userId,
        messageId: parsed.messageId
      });

      io.to(roomName(user.tenantId, receipt.conversationId)).emit('message_read', receipt);
      ack?.({ ok: true, data: receipt });
    })
  );

  socket.on('disconnect', () => {
    setUserOffline(user.tenantId, user.userId).catch(() => undefined);
  });
};
