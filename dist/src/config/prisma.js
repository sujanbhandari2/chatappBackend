"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const tenant_context_1 = require("../utils/tenant-context");
const tenantScopedModels = new Set(['User', 'Conversation', 'Message']);
const addTenantWhere = (args, tenantId) => {
    const existingWhere = args?.where ?? undefined;
    return {
        ...(args ?? {}),
        where: existingWhere ? { AND: [existingWhere, { tenantId }] } : { tenantId }
    };
};
exports.prisma = new client_1.PrismaClient();
exports.prisma.$use(async (params, next) => {
    const { tenantId } = (0, tenant_context_1.getTenantContext)();
    if (!tenantId || !params.model || !tenantScopedModels.has(params.model)) {
        return next(params);
    }
    switch (params.action) {
        case 'findUnique':
            params.action = 'findFirst';
            params.args = addTenantWhere(params.args, tenantId);
            break;
        case 'findUniqueOrThrow':
            params.action = 'findFirstOrThrow';
            params.args = addTenantWhere(params.args, tenantId);
            break;
        case 'findFirst':
        case 'findFirstOrThrow':
        case 'findMany':
        case 'count':
        case 'aggregate':
        case 'groupBy':
        case 'updateMany':
        case 'deleteMany':
            params.args = addTenantWhere(params.args, tenantId);
            break;
        case 'create': {
            params.args = {
                ...params.args,
                data: {
                    ...(params.args?.data ?? {}),
                    tenantId
                }
            };
            break;
        }
        case 'createMany': {
            const original = params.args?.data;
            const data = Array.isArray(original)
                ? original.map((item) => ({ ...item, tenantId }))
                : { ...(original ?? {}), tenantId };
            params.args = {
                ...params.args,
                data
            };
            break;
        }
        case 'upsert': {
            params.args = {
                ...params.args,
                create: {
                    ...(params.args?.create ?? {}),
                    tenantId
                },
                update: {
                    ...(params.args?.update ?? {}),
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
