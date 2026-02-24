"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const prisma_1 = require("../../config/prisma");
const api_error_1 = require("../../utils/api-error");
const jwt_1 = require("../../utils/jwt");
const password_1 = require("../../utils/password");
const DEFAULT_TENANT_NAME = 'Public Healthcare Chat';
const ensureDefaultTenant = async () => {
    const firstTenant = await prisma_1.prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' }
    });
    if (firstTenant) {
        return firstTenant;
    }
    return prisma_1.prisma.tenant.create({
        data: {
            name: DEFAULT_TENANT_NAME
        }
    });
};
const ensureUserInGlobalConversation = async (tenantId, userId) => {
    let globalConversation = await prisma_1.prisma.conversation.findFirst({
        where: {
            tenantId,
            isGlobal: true
        }
    });
    if (!globalConversation) {
        globalConversation = await prisma_1.prisma.conversation.create({
            data: {
                tenantId,
                isGlobal: true
            }
        });
    }
    await prisma_1.prisma.conversationParticipant.upsert({
        where: {
            conversationId_userId: {
                conversationId: globalConversation.id,
                userId
            }
        },
        create: {
            conversationId: globalConversation.id,
            userId
        },
        update: {}
    });
};
const formatAuthResponse = (user) => {
    const token = (0, jwt_1.signToken)({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        username: user.username
    });
    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            tenantId: user.tenantId,
            role: user.role
        }
    };
};
const register = async (input) => {
    const normalizedUsername = input.username.trim().toLowerCase();
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: {
            username: normalizedUsername
        }
    });
    if (existingUser) {
        throw new api_error_1.ApiError(409, 'Username already exists');
    }
    const tenant = await ensureDefaultTenant();
    const passwordHash = await (0, password_1.hashPassword)(input.password);
    const user = await prisma_1.prisma.user.create({
        data: {
            tenantId: tenant.id,
            role: 'CLIENT',
            username: normalizedUsername,
            email: `${normalizedUsername}@local.chat`,
            passwordHash
        },
        select: {
            id: true,
            username: true,
            tenantId: true,
            role: true
        }
    });
    await ensureUserInGlobalConversation(user.tenantId, user.id);
    return formatAuthResponse(user);
};
exports.register = register;
const login = async (input) => {
    const normalizedUsername = input.username.trim().toLowerCase();
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            username: normalizedUsername
        }
    });
    if (!user) {
        throw new api_error_1.ApiError(401, 'Invalid credentials');
    }
    const isPasswordValid = await (0, password_1.comparePassword)(input.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new api_error_1.ApiError(401, 'Invalid credentials');
    }
    await ensureUserInGlobalConversation(user.tenantId, user.id);
    return formatAuthResponse({
        id: user.id,
        username: user.username,
        tenantId: user.tenantId,
        role: user.role
    });
};
exports.login = login;
