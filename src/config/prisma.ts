import { PrismaClient } from '@prisma/client';
import { getTenantContext } from '../utils/tenant-context';

const tenantScopedModels = new Set(['User', 'Conversation', 'Message', 'Reaction']);

const addTenantWhere = (
  args: Record<string, unknown> | undefined,
  tenantId: string,
  model: string
): Record<string, unknown> => {
  const existingWhere = (args?.where as Record<string, unknown> | undefined) ?? undefined;
  const tenantScope = model === 'Message' ? { conversation: { tenantId } } : { tenantId };

  return {
    ...(args ?? {}),
    where: existingWhere ? { AND: [existingWhere, tenantScope] } : tenantScope
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
      params.args = addTenantWhere(params.args as Record<string, unknown>, tenantId, params.model);
      break;
    case 'findUniqueOrThrow':
      params.action = 'findFirstOrThrow';
      params.args = addTenantWhere(params.args as Record<string, unknown>, tenantId, params.model);
      break;
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'findMany':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'updateMany':
    case 'deleteMany':
      params.args = addTenantWhere(params.args as Record<string, unknown>, tenantId, params.model);
      break;
    case 'create': {
      if (params.model === 'Message') {
        break;
      }
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
      if (params.model === 'Message') {
        break;
      }
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
      if (params.model === 'Message') {
        break;
      }
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
