import { prisma } from '../../config/prisma';
import { isUserOnline } from '../../services/presence.service';

interface ListUsersInput {
  tenantId: string;
  requesterId: string;
}

export const listUsers = async (input: ListUsersInput) => {
  const users = await prisma.user.findMany({
    where: {
      tenantId: input.tenantId
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
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
