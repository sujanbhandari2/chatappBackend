import { DevicePlatform, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { isUserOnline } from '../../services/presence.service';
import { triggerPushNotification } from '../../services/push-notification.service';

interface ListUsersInput {
  tenantId: string;
  role: Role;
  requesterId: string;
}

interface RegisterPushTokenInput {
  tenantId: string;
  userId: string;
  token: string;
  platform: DevicePlatform;
  deviceId?: string;
}

interface UnregisterPushTokenInput {
  tenantId: string;
  userId: string;
  token: string;
}

interface SendTestPushInput {
  tenantId: string;
  userId: string;
  message: string;
}

export const listUsers = async (input: ListUsersInput) => {
  const users = await prisma.user.findMany({
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

  const statusByUser = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      isOnline: await isUserOnline(input.tenantId, user.id)
    }))
  );

  const statusMap = new Map(statusByUser.map((entry) => [entry.userId, entry.isOnline]));

  return users.map((user) => ({
    ...user,
    isOnline: statusMap.get(user.id) ?? false
  }));
};

export const registerPushToken = async (input: RegisterPushTokenInput) => {
  await prisma.userPushToken.upsert({
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

export const unregisterPushToken = async (input: UnregisterPushTokenInput) => {
  await prisma.userPushToken.deleteMany({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      token: input.token
    }
  });

  return { ok: true };
};

export const sendTestPush = async (input: SendTestPushInput) => {
  const result = await triggerPushNotification({
    tenantId: input.tenantId,
    recipientUserIds: [input.userId],
    conversationId: '00000000-0000-0000-0000-000000000000',
    messagePreview: input.message
  });

  return result;
};
