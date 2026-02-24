"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsDelivered = exports.markAsRead = exports.deleteMessage = exports.reactToMessage = exports.sendMessage = exports.createConversation = exports.getMessages = exports.getConversations = exports.hasConversationAccess = void 0;
const prisma_1 = require("../../config/prisma");
const api_error_1 = require("../../utils/api-error");
const push_notification_service_1 = require("../../services/push-notification.service");
const hasConversationAccess = async (ctx, conversationId) => {
    if (ctx.role === 'ADMIN') {
        const conversation = await prisma_1.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                tenantId: ctx.tenantId
            }
        });
        return Boolean(conversation);
    }
    const participant = await prisma_1.prisma.conversationParticipant.findFirst({
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
exports.hasConversationAccess = hasConversationAccess;
const assertConversationAccess = async (ctx, conversationId) => {
    const allowed = await (0, exports.hasConversationAccess)(ctx, conversationId);
    if (!allowed) {
        throw new api_error_1.ApiError(403, 'Access denied for this conversation');
    }
};
const assertMessageAccess = async (ctx, messageId) => {
    const message = await prisma_1.prisma.message.findFirst({
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
        throw new api_error_1.ApiError(404, 'Message not found');
    }
    const isParticipant = message.conversation.participants.some((item) => item.userId === ctx.userId);
    if (ctx.role !== 'ADMIN' && !isParticipant) {
        throw new api_error_1.ApiError(403, 'Access denied for this message');
    }
    return message;
};
const getConversations = async (ctx) => {
    if (ctx.role === 'ADMIN') {
        return prisma_1.prisma.conversation.findMany({
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
    return prisma_1.prisma.conversation.findMany({
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
exports.getConversations = getConversations;
const getMessages = async (input) => {
    await assertConversationAccess(input, input.conversationId);
    const skip = (input.page - 1) * input.pageSize;
    const [total, messages] = await Promise.all([
        prisma_1.prisma.message.count({
            where: {
                conversationId: input.conversationId,
                tenantId: input.tenantId
            }
        }),
        prisma_1.prisma.message.findMany({
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
        data: messages.reverse(),
        pagination: {
            page: input.page,
            pageSize: input.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / input.pageSize))
        }
    };
};
exports.getMessages = getMessages;
const createConversation = async (input) => {
    const participantIds = Array.from(new Set([...input.participantIds, input.creatorId]));
    const users = await prisma_1.prisma.user.findMany({
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
        throw new api_error_1.ApiError(400, 'One or more users are not in the tenant');
    }
    const conversation = await prisma_1.prisma.conversation.create({
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
exports.createConversation = createConversation;
const sendMessage = async (input) => {
    await assertConversationAccess(input, input.conversationId);
    const message = await prisma_1.prisma.message.create({
        data: {
            conversationId: input.conversationId,
            tenantId: input.tenantId,
            senderId: input.userId,
            type: input.type,
            content: input.content
        },
        include: {
            reactions: true,
            deliveredReceipts: true,
            readReceipts: true
        }
    });
    const participants = await prisma_1.prisma.conversationParticipant.findMany({
        where: { conversationId: input.conversationId },
        select: { userId: true }
    });
    await (0, push_notification_service_1.triggerPushNotification)({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipientUserIds: participants.filter((p) => p.userId !== input.userId).map((p) => p.userId),
        messagePreview: input.type === 'TEXT' ? input.content.slice(0, 120) : `[${input.type}]`
    });
    return message;
};
exports.sendMessage = sendMessage;
const reactToMessage = async (input) => {
    const message = await assertMessageAccess(input, input.messageId);
    if (message.deletedAt) {
        throw new api_error_1.ApiError(400, 'Cannot react to deleted message');
    }
    const reaction = await prisma_1.prisma.messageReaction.upsert({
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
exports.reactToMessage = reactToMessage;
const deleteMessage = async (input) => {
    const message = await assertMessageAccess(input, input.messageId);
    if (input.role !== 'ADMIN' && message.senderId !== input.userId) {
        throw new api_error_1.ApiError(403, 'Only message sender or admin can delete this message');
    }
    const deletedAt = new Date();
    await prisma_1.prisma.message.updateMany({
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
exports.deleteMessage = deleteMessage;
const markAsRead = async (input) => {
    const message = await assertMessageAccess(input, input.messageId);
    await prisma_1.prisma.deliveryReceipt.upsert({
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
    const readReceipt = await prisma_1.prisma.readReceipt.upsert({
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
exports.markAsRead = markAsRead;
const markAsDelivered = async (input) => {
    const message = await assertMessageAccess(input, input.messageId);
    const deliveredReceipt = await prisma_1.prisma.deliveryReceipt.upsert({
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
exports.markAsDelivered = markAsDelivered;
