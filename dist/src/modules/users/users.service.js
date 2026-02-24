"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestPush = exports.unregisterPushToken = exports.registerPushToken = exports.listUsers = void 0;
const prisma_1 = require("../../config/prisma");
const presence_service_1 = require("../../services/presence.service");
const push_notification_service_1 = require("../../services/push-notification.service");
const listUsers = async (input) => {
    const users = await prisma_1.prisma.user.findMany({
        where: {
            tenantId: input.tenantId
        },
        select: {
            id: true,
            tenantId: true,
            username: true,
            role: true,
            createdAt: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    const statusByUser = await Promise.all(users.map(async (user) => ({
        userId: user.id,
        isOnline: await (0, presence_service_1.isUserOnline)(input.tenantId, user.id)
    })));
    const statusMap = new Map(statusByUser.map((entry) => [entry.userId, entry.isOnline]));
    return users.map((user) => ({
        ...user,
        isOnline: statusMap.get(user.id) ?? false
    }));
};
exports.listUsers = listUsers;
const registerPushToken = async (input) => {
    await prisma_1.prisma.userPushToken.upsert({
        where: {
            token: input.token
        },
        create: {
            tenantId: input.tenantId,
            userId: input.userId,
            token: input.token,
            platform: input.platform,
            deviceId: input.deviceId,
            lastSeenAt: new Date()
        },
        update: {
            tenantId: input.tenantId,
            userId: input.userId,
            platform: input.platform,
            deviceId: input.deviceId,
            lastSeenAt: new Date()
        }
    });
    return { ok: true };
};
exports.registerPushToken = registerPushToken;
const unregisterPushToken = async (input) => {
    await prisma_1.prisma.userPushToken.deleteMany({
        where: {
            tenantId: input.tenantId,
            userId: input.userId,
            token: input.token
        }
    });
    return { ok: true };
};
exports.unregisterPushToken = unregisterPushToken;
const sendTestPush = async (input) => {
    const result = await (0, push_notification_service_1.triggerPushNotification)({
        tenantId: input.tenantId,
        recipientUserIds: [input.userId],
        conversationId: '00000000-0000-0000-0000-000000000000',
        messagePreview: input.message
    });
    return result;
};
exports.sendTestPush = sendTestPush;
