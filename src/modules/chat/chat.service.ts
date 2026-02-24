import { MessageType, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { triggerPushNotification } from '../../services/push-notification.service';
import { decryptMessageContent, encryptMessageContent } from '../../utils/message-crypto';
import { logger } from '../../config/logger';

interface AuthContext {
  tenantId: string;
  userId: string;
  role: Role;
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

interface SendMessageInput extends AuthContext {
  conversationId: string;
  type: MessageType;
  content: string;
}

interface ReactionInput extends AuthContext {
  messageId: string;
  reactionType: string;
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

const decryptMessageForOutput = <T extends { id: string; content: string }>(message: T): T => {
  try {
    return {
      ...message,
      content: decryptMessageContent(message.content)
    };
  } catch (error) {
    logger.error('Failed to decrypt message content for output', {
      messageId: message.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      ...message,
      content: '[Unable to decrypt message]'
    };
  }
};

export const hasConversationAccess = async (ctx: AuthContext, conversationId: string): Promise<boolean> => {
  if (ctx.role === 'ADMIN') {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId: ctx.tenantId
      }
    });

    return Boolean(conversation);
  }

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
      tenantId: ctx.tenantId
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

  if (ctx.role !== 'ADMIN' && !isParticipant) {
    throw new ApiError(403, 'Access denied for this message');
  }

  return message;
};

export const getConversations = async (ctx: AuthContext) => {
  if (ctx.role === 'ADMIN') {
    return prisma.conversation.findMany({
      where: {
        tenantId: ctx.tenantId
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }]
    });
  }

  return prisma.conversation.findMany({
    where: {
      tenantId: ctx.tenantId,
      participants: {
        some: {
          userId: ctx.userId
        }
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      }
    },
    orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }]
  });
};

export const getMessages = async (input: PaginatedMessagesInput) => {
  await assertConversationAccess(input, input.conversationId);

  const skip = (input.page - 1) * input.pageSize;

  const [total, messages] = await Promise.all([
    prisma.message.count({
      where: {
        conversationId: input.conversationId,
        tenantId: input.tenantId
      }
    }),
    prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        tenantId: input.tenantId
      },
      include: {
        reactions: true,
        deliveredReceipts: true,
        readReceipts: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: input.pageSize
    })
  ]);

  return {
    data: messages.reverse().map((message) => decryptMessageForOutput(message)),
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
      participants: {
        createMany: {
          data: participantIds.map((userId) => ({ userId }))
        }
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      }
    }
  });

  return conversation;
};

export const sendMessage = async (input: SendMessageInput) => {
  await assertConversationAccess(input, input.conversationId);

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      senderId: input.userId,
      type: input.type,
      content: encryptMessageContent(input.content)
    },
    include: {
      reactions: true,
      deliveredReceipts: true,
      readReceipts: true
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

  return decryptMessageForOutput(message);
};

export const reactToMessage = async (input: ReactionInput) => {
  const message = await assertMessageAccess(input, input.messageId);

  if (message.deletedAt) {
    throw new ApiError(400, 'Cannot react to deleted message');
  }

  const reaction = await prisma.messageReaction.upsert({
    where: {
      messageId_userId: {
        messageId: input.messageId,
        userId: input.userId
      }
    },
    update: {
      reactionType: input.reactionType
    },
    create: {
      messageId: input.messageId,
      userId: input.userId,
      reactionType: input.reactionType
    }
  });

  return {
    ...reaction,
    conversationId: message.conversationId
  };
};

export const deleteMessage = async (input: DeleteMessageInput) => {
  const message = await assertMessageAccess(input, input.messageId);

  if (input.role !== 'ADMIN' && message.senderId !== input.userId) {
    throw new ApiError(403, 'Only message sender or admin can delete this message');
  }

  const deletedAt = new Date();

  await prisma.message.updateMany({
    where: {
      id: input.messageId,
      tenantId: input.tenantId
    },
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

  await prisma.deliveryReceipt.upsert({
    where: {
      messageId_userId: {
        messageId: input.messageId,
        userId: input.userId
      }
    },
    update: {
      deliveredAt: new Date()
    },
    create: {
      messageId: input.messageId,
      userId: input.userId,
      deliveredAt: new Date()
    }
  });

  const readReceipt = await prisma.readReceipt.upsert({
    where: {
      messageId_userId: {
        messageId: input.messageId,
        userId: input.userId
      }
    },
    update: {
      readAt: new Date()
    },
    create: {
      messageId: input.messageId,
      userId: input.userId,
      readAt: new Date()
    }
  });

  return {
    ...readReceipt,
    conversationId: message.conversationId
  };
};

export const markAsDelivered = async (input: MarkAsDeliveredInput) => {
  const message = await assertMessageAccess(input, input.messageId);

  const deliveredReceipt = await prisma.deliveryReceipt.upsert({
    where: {
      messageId_userId: {
        messageId: input.messageId,
        userId: input.userId
      }
    },
    update: {
      deliveredAt: new Date()
    },
    create: {
      messageId: input.messageId,
      userId: input.userId,
      deliveredAt: new Date()
    }
  });

  return {
    ...deliveredReceipt,
    conversationId: message.conversationId
  };
};
