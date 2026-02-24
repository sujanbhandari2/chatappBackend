"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSocketUser = void 0;
const jwt_1 = require("../utils/jwt");
const extractSocketUser = (socket) => {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers.authorization?.replace('Bearer ', '');
    const rawToken = authToken || headerToken;
    if (!rawToken) {
        throw new Error('Unauthorized: missing token');
    }
    const payload = (0, jwt_1.verifyToken)(rawToken);
    return {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        username: payload.username
    };
};
exports.extractSocketUser = extractSocketUser;
