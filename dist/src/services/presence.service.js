"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserOnline = exports.setUserOffline = exports.setUserOnline = void 0;
const redis_1 = require("../config/redis");
const ONLINE_KEY_PREFIX = 'presence:user:';
const localPresence = new Set();
const userKey = (tenantId, userId) => `${ONLINE_KEY_PREFIX}${tenantId}:${userId}`;
const setUserOnline = async (tenantId, userId) => {
    if (!redis_1.redis) {
        localPresence.add(`${tenantId}:${userId}`);
        return;
    }
    await redis_1.redis.set(userKey(tenantId, userId), '1');
};
exports.setUserOnline = setUserOnline;
const setUserOffline = async (tenantId, userId) => {
    if (!redis_1.redis) {
        localPresence.delete(`${tenantId}:${userId}`);
        return;
    }
    await redis_1.redis.del(userKey(tenantId, userId));
};
exports.setUserOffline = setUserOffline;
const isUserOnline = async (tenantId, userId) => {
    if (!redis_1.redis) {
        return localPresence.has(`${tenantId}:${userId}`);
    }
    const value = await redis_1.redis.get(userKey(tenantId, userId));
    return value === '1';
};
exports.isUserOnline = isUserOnline;
