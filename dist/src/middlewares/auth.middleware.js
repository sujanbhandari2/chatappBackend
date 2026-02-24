"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const prisma_1 = require("../config/prisma");
const jwt_1 = require("../utils/jwt");
const api_error_1 = require("../utils/api-error");
const tenant_context_1 = require("../utils/tenant-context");
const extractToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        throw new api_error_1.ApiError(401, 'Missing authorization header');
    }
    const [prefix, token] = authorizationHeader.split(' ');
    if (prefix !== 'Bearer' || !token) {
        throw new api_error_1.ApiError(401, 'Invalid authorization header');
    }
    return token;
};
const authenticate = (req, _res, next) => {
    try {
        const token = extractToken(req.headers.authorization);
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = {
            id: payload.userId,
            tenantId: payload.tenantId,
            role: payload.role,
            username: payload.username
        };
        req.prisma = prisma_1.prisma;
        (0, tenant_context_1.runWithTenantContext)({
            tenantId: payload.tenantId,
            userId: payload.userId,
            role: payload.role
        }, () => next());
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
