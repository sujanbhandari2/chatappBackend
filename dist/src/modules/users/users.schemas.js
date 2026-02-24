"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPushSchema = exports.unregisterPushTokenSchema = exports.registerPushTokenSchema = void 0;
const zod_1 = require("zod");
exports.registerPushTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(20).max(4096),
    platform: zod_1.z.enum(['IOS', 'ANDROID', 'WEB']),
    deviceId: zod_1.z.string().min(1).max(255).optional()
});
exports.unregisterPushTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(20).max(4096)
});
exports.testPushSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(120).default('Test push notification from HealthChat')
});
