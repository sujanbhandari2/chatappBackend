import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { triggerPushNotification } from '../../services/push-notification.service';
import { getSignedFileUrl, uploadFileToS3 } from '../../services/file-storage.service';
import {
  decryptMessageContent,
  encryptMessageContent,
  isEncryptedPayload,
  MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID
} from '../../utils/message-crypto';
import { logger } from '../../config/logger';

/**
 * Fields needed to decrypt reply previews. Cast to `MessageSelect` so tooling matches the
 * generated client after `npx prisma generate` (see `postinstall` in package.json).
 */
const replyToMessageSelect = {
  id: true,
  senderId: true,
  content: true,
  contentEncryption: true,
  messageType: true
} as Prisma.MessageSelect;

type MessageKind = 'TEXT' | 'IMAGE' | 'VOICE';

interface AuthContext {
  tenantId: string;
  userId: string;
}

interface PaginatedMessagesInput extends AuthContext {
  conversationId: string;
  page: number;
  pageSize: number;
}

interface CreateConversationInput {
  tenantId: string;
  creatorId: string;
  participantIds: string[];
}

interface CreateDirectConversationInput extends AuthContext {
  targetUserId: string;
}

interface CreateGroupConversationInput extends AuthContext {
  title: string;
  participantIds: string[];
}

interface SendMessageInput extends AuthContext {
  conversationId: string;
  type: MessageKind;
  content: string;
  replyToMessageId?: string;
}

interface DeleteMessageInput extends AuthContext {
  messageId: string;
}

interface MarkAsReadInput extends AuthContext {
  messageId: string;
}

interface MarkAsDeliveredInput extends AuthContext {
  messageId: string;
}

interface AddReactionInput extends AuthContext {
  messageId: string;
  emoji: string;
}

interface RemoveReactionInput extends AuthContext {
  messageId: string;
  emoji: string;
}

const isAssetMessage = (type: string): boolean => type === 'IMAGE' || type === 'VOICE';

/** S3 key is stored in DB; clients receive fresh signed URLs when messages are loaded. */
const deriveAssetMessageType = (mimetype: string): MessageKind => {
  const m = (mimetype || '').trim().toLowerCase();
  if (m.startsWith('audio/')) {
    return 'VOICE';
  }
  if (m.startsWith('image/')) {
    return 'IMAGE';
  }
  return 'IMAGE';
};

const reactionInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true
    }
  }
} as const;

const conversationInclude = {
  participants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          status: true
        }
      }
    }
  }
} as const;

const resolveMessageForOutput = async <
  T extends { id: string; content: string; messageType: string; contentEncryption?: string | null }
>(
  message: T,
  tenantId: string
): Promise<T> => {
  try {
    const decryptedContent = decryptMessageContent(message.content, message.contentEncryption);
    const resolvedContent = isAssetMessage(message.messageType)
      ? await getSignedFileUrl(decryptedContent, tenantId)
      : decryptedContent;

    return {
      ...message,
      content: resolvedContent
    };
  } catch (error) {
    logger.error('Failed to resolve message content for output', {
      messageId: message.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      ...message,
      content: '[Unable to decrypt message]'
    };
  }
};

const resolveMessageReplyForOutput = async <
  T extends {
    id: string;
    content: string;
    messageType: string;
    contentEncryption?: string | null;
    replyToMessage?: {
      id: string;
      content: string;
      messageType: string;
      contentEncryption?: string | null;
    } | null;
  }
>(
  message: T,
  tenantId: string
): Promise<T> => {
  const resolved = await resolveMessageForOutput(message, tenantId);

  if (!resolved.replyToMessage) {
    return resolved;
  }

  const reply = await resolveMessageForOutput(resolved.replyToMessage, tenantId);
  return {
    ...resolved,
    replyToMessage: reply
  };
};

export const hasConversationAccess = async (ctx: AuthContext, conversationId: string): Promise<boolean> => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: ctx.userId,
      conversation: {
        tenantId: ctx.tenantId
      }
    }
  });

  return Boolean(participant);
};

const assertConversationAccess = async (ctx: AuthContext, conversationId: string): Promise<void> => {
  const allowed = await hasConversationAccess(ctx, conversationId);

  if (!allowed) {
    throw new ApiError(403, 'Access denied for this conversation');
  }
};

const assertMessageAccess = async (ctx: AuthContext, messageId: string) => {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      conversation: {
        tenantId: ctx.tenantId
      }
    },
    include: {
      conversation: {
        include: {
          participants: {
            select: { userId: true }
          }
        }
      }
    }
  });

  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  const isParticipant = message.conversation.participants.some((item) => item.userId === ctx.userId);

  if (!isParticipant) {
    throw new ApiError(403, 'Access denied for this message');
  }

  return message;
};

export const getConversations = async (ctx: AuthContext) => {
  return prisma.conversation.findMany({
    where: {
      tenantId: ctx.tenantId,
      participants: {
        some: {
          userId: ctx.userId
        }
      }
    },
    include: conversationInclude,
    orderBy: [{ createdAt: 'desc' }]
  });
};

export const getMessages = async (input: PaginatedMessagesInput) => {
  await assertConversationAccess(input, input.conversationId);

  const skip = (input.page - 1) * input.pageSize;

  const [total, messages] = await Promise.all([
    prisma.message.count({
      where: {
        conversationId: input.conversationId,
        conversation: {
          tenantId: input.tenantId
        }
      }
    }),
    prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        conversation: {
          tenantId: input.tenantId
        }
      },
      include: {
        attachments: true,
        replyToMessage: {
          select: replyToMessageSelect
        },
        reactions: {
          include: reactionInclude,
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: input.pageSize
    })
  ]);

  return {
    data: await Promise.all(messages.reverse().map((message) => resolveMessageReplyForOutput(message, input.tenantId))),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize))
    }
  };
};

export const createConversation = async (input: CreateConversationInput) => {
  const participantIds = Array.from(new Set([...input.participantIds, input.creatorId]));

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: participantIds
      },
      tenantId: input.tenantId
    },
    select: {
      id: true
    }
  });

  if (users.length !== participantIds.length) {
    throw new ApiError(400, 'One or more users are not in the tenant');
  }

  const conversation = await prisma.conversation.create({
    data: {
      tenantId: input.tenantId,
      createdBy: input.creatorId,
      type: 'GROUP',
      participants: {
        createMany: {
          data: participantIds.map((userId) => ({ userId }))
        }
      }
    },
    include: conversationInclude
  });

  return conversation;
};

export const createOrGetDirectConversation = async (input: CreateDirectConversationInput) => {
  if (input.targetUserId === input.userId) {
    throw new ApiError(400, 'Cannot start direct chat with yourself');
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: input.targetUserId,
      tenantId: input.tenantId
    },
    select: { id: true }
  });

  if (!targetUser) {
    throw new ApiError(404, 'User not found in tenant');
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      tenantId: input.tenantId,
      type: 'DIRECT',
      participants: {
        every: {
          userId: {
            in: [input.userId, input.targetUserId]
          }
        },
        some: {
          userId: input.userId
        }
      },
      AND: [
        {
          participants: {
            some: {
              userId: input.targetUserId
            }
          }
        }
      ]
    },
    include: conversationInclude
  });

  if (existing && existing.participants.length === 2) {
    return existing;
  }

  return prisma.conversation.create({
    data: {
      tenantId: input.tenantId,
      createdBy: input.userId,
      type: 'DIRECT',
      participants: {
        createMany: {
          data: [{ userId: input.userId }, { userId: input.targetUserId }]
        }
      }
    },
    include: conversationInclude
  });
};

export const createGroupConversation = async (input: CreateGroupConversationInput) => {
  const participantIds = Array.from(new Set([...input.participantIds, input.userId]));

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: participantIds
      },
      tenantId: input.tenantId
    },
    select: {
      id: true
    }
  });

  if (users.length !== participantIds.length) {
    throw new ApiError(400, 'One or more users are not in the tenant');
  }

  return prisma.conversation.create({
    data: {
      tenantId: input.tenantId,
      createdBy: input.userId,
      type: 'GROUP',
      title: input.title.trim(),
      participants: {
        createMany: {
          data: participantIds.map((userId) => ({ userId }))
        }
      }
    },
    include: conversationInclude
  });
};

export const sendMessage = async (input: SendMessageInput) => {
  await assertConversationAccess(input, input.conversationId);

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: input.conversationId,
      tenantId: input.tenantId
    },
    select: {
      id: true,
      type: true
    }
  });

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  if (input.replyToMessageId) {
    const parentMessage = await prisma.message.findFirst({
      where: {
        id: input.replyToMessageId,
        conversationId: input.conversationId
      },
      select: { id: true }
    });

    if (!parentMessage) {
      throw new ApiError(400, 'Reply target not found in this conversation');
    }

    if (conversation.type === 'DIRECT') {
      const existingReply = await prisma.message.findFirst({
        where: {
          conversationId: input.conversationId,
          replyToMessageId: input.replyToMessageId
        },
        select: { id: true }
      });

      if (existingReply) {
        throw new ApiError(409, 'Direct chat allows only one reply per message');
      }
    }
  }

  const encryptedContent = encryptMessageContent(input.content);
  const contentEncryption = isEncryptedPayload(encryptedContent)
    ? MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID
    : null;

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.userId,
      messageType: input.type,
      content: encryptedContent,
      contentEncryption,
      replyToMessageId: input.replyToMessageId
    } as Prisma.MessageUncheckedCreateInput,
    include: {
      attachments: true,
      replyToMessage: {
        select: replyToMessageSelect
      },
      reactions: {
        include: reactionInclude,
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: input.conversationId },
    select: { userId: true }
  });

  await triggerPushNotification({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    recipientUserIds: participants.filter((p) => p.userId !== input.userId).map((p) => p.userId),
    messagePreview: input.type === 'TEXT' ? input.content.slice(0, 120) : `[${input.type}]`
  });

  return resolveMessageReplyForOutput(message, input.tenantId);
};

export const uploadAndSendAssetMessage = async (input: {
  tenantId: string;
  userId: string;
  conversationId: string;
  buffer: Buffer;
  mimetype: string;
  originalName: string;
  replyToMessageId?: string;
}) => {
  const { key } = await uploadFileToS3({
    buffer: input.buffer,
    mimetype: input.mimetype,
    originalName: input.originalName,
    tenantId: input.tenantId,
    userId: input.userId
  });

  const type = deriveAssetMessageType(input.mimetype);

  return sendMessage({
    tenantId: input.tenantId,
    userId: input.userId,
    conversationId: input.conversationId,
    type,
    content: key,
    replyToMessageId: input.replyToMessageId
  });
};

const getMessageReactions = async (messageId: string) => {
  return prisma.reaction.findMany({
    where: { messageId },
    include: reactionInclude,
    orderBy: {
      createdAt: 'asc'
    }
  });
};

export const addReaction = async (input: AddReactionInput) => {
  const message = await assertMessageAccess(input, input.messageId);

  await prisma.reaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId: input.messageId,
        userId: input.userId,
        emoji: input.emoji
      }
    },
    create: {
      tenantId: input.tenantId,
      messageId: input.messageId,
      userId: input.userId,
      emoji: input.emoji
    },
    update: {}
  });

  const reactions = await getMessageReactions(input.messageId);

  return {
    messageId: input.messageId,
    conversationId: message.conversationId,
    reactions
  };
};

export const removeReaction = async (input: RemoveReactionInput) => {
  const message = await assertMessageAccess(input, input.messageId);

  await prisma.reaction.deleteMany({
    where: {
      messageId: input.messageId,
      userId: input.userId,
      emoji: input.emoji
    }
  });

  const reactions = await getMessageReactions(input.messageId);

  return {
    messageId: input.messageId,
    conversationId: message.conversationId,
    reactions
  };
};

export const deleteMessage = async (input: DeleteMessageInput) => {
  const message = await assertMessageAccess(input, input.messageId);

  if (message.senderId !== input.userId) {
    throw new ApiError(403, 'Only message sender can delete this message');
  }

  const deletedAt = new Date();

  await prisma.message.updateMany({
    where: { id: input.messageId },
    data: {
      deletedAt,
      content: '[deleted]'
    }
  });

  return {
    messageId: input.messageId,
    conversationId: message.conversationId,
    deletedAt
  };
};

export const markAsRead = async (input: MarkAsReadInput) => {
  const message = await assertMessageAccess(input, input.messageId);
  const now = new Date();

  await prisma.$transaction([
    prisma.message.update({
      where: { id: input.messageId },
      data: {
        readAt: now,
        deliveredAt: message.deliveredAt ?? now
      }
    }),
    prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId: input.userId
        }
      },
      create: {
        conversationId: message.conversationId,
        userId: input.userId,
        lastReadMessageId: message.id,
        lastDeliveredMessageId: message.id
      },
      update: {
        lastReadMessageId: message.id,
        lastDeliveredMessageId: message.id
      }
    })
  ]);

  return {
    messageId: message.id,
    userId: input.userId,
    readAt: now,
    conversationId: message.conversationId
  };
};

export const markAsDelivered = async (input: MarkAsDeliveredInput) => {
  const message = await assertMessageAccess(input, input.messageId);
  const now = new Date();

  await prisma.$transaction([
    prisma.message.update({
      where: { id: input.messageId },
      data: { deliveredAt: now }
    }),
    prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId: input.userId
        }
      },
      create: {
        conversationId: message.conversationId,
        userId: input.userId,
        lastDeliveredMessageId: message.id
      },
      update: {
        lastDeliveredMessageId: message.id
      }
    })
  ]);

  return {
    messageId: message.id,
    userId: input.userId,
    deliveredAt: now,
    conversationId: message.conversationId
  };
};

export const deleteConversation = async (ctx: AuthContext, conversationId: string) => {
  await assertConversationAccess(ctx, conversationId);

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: ctx.tenantId },
    select: { id: true, type: true, createdBy: true }
  });

  if (!conv) {
    throw new ApiError(404, 'Conversation not found');
  }

  if (conv.type === 'GROUP') {
    if (!conv.createdBy || conv.createdBy !== ctx.userId) {
      throw new ApiError(403, 'Only the group creator can delete this conversation');
    }
  }

  await prisma.conversation.delete({
    where: { id: conversationId }
  });

  return { id: conversationId };
};
