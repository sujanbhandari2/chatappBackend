"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const usernameSchema = zod_1.z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'username can include only letters, numbers, and underscore');
const passwordSchema = zod_1.z.string().min(8).max(128);
exports.registerSchema = zod_1.z.object({
    username: usernameSchema,
    password: passwordSchema
});
exports.loginSchema = zod_1.z.object({
    username: usernameSchema,
    password: passwordSchema
});
