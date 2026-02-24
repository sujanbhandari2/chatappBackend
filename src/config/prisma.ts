import { PrismaClient } from '@prisma/client';
import { getTenantContext } from '../utils/tenant-context';

const tenantScopedModels = new Set(['User', 'Conversation', 'Message']);

const addTenantWhere = (args: Record<string, unknown> | undefined, tenantId: string): Record<string, unknown> => {
  const existingWhere = (args?.where as Record<string, unknown> | undefined) ?? undefined;

  return {
    ...(args ?? {}),
    where: existingWhere ? { AND: [existingWhere, { tenantId }] } : { tenantId }
  };
};

export const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  const { tenantId } = getTenantContext();

  if (!tenantId || !params.model || !tenantScopedModels.has(params.model)) {
    return next(params);
  }

  switch (params.action) {
    case 'findUnique':
      params.action = 'findFirst';
      params.args = addTenantWhere(params.args as Record<string, unknown>, tenantId);
      break;
    case 'findUniqueOrThrow':
      params.action = 'findFirstOrThrow';
      params.args = addTenantWhere(params.args as Record<string, unknown>, tenantId);
      break;
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'findMany':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'updateMany':
    case 'deleteMany':
      params.args = addTenantWhere(params.args as Record<string, unknown>, tenantId);
      break;
    case 'create': {
      params.args = {
        ...(params.args as Record<string, unknown>),
        data: {
          ...((params.args as Record<string, any>)?.data ?? {}),
          tenantId
        }
      };
      break;
    }
    case 'createMany': {
      const original = (params.args as Record<string, any>)?.data;
      const data = Array.isArray(original)
        ? original.map((item) => ({ ...item, tenantId }))
        : { ...(original ?? {}), tenantId };

      params.args = {
        ...(params.args as Record<string, unknown>),
        data
      };
      break;
    }
    case 'upsert': {
      params.args = {
        ...(params.args as Record<string, unknown>),
        create: {
          ...((params.args as Record<string, any>)?.create ?? {}),
          tenantId
        },
        update: {
          ...((params.args as Record<string, any>)?.update ?? {}),
          tenantId
        }
      };
      break;
    }
    default:
      break;
  }

  return next(params);
});
