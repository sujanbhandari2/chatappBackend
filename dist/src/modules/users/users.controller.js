"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPush = exports.unregisterPushToken = exports.registerPushToken = exports.listUsers = void 0;
const api_error_1 = require("../../utils/api-error");
const usersService = __importStar(require("./users.service"));
const listUsers = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new api_error_1.ApiError(401, 'Unauthorized');
        }
        const users = await usersService.listUsers({
            tenantId: req.user.tenantId,
            requesterId: req.user.id,
            role: req.user.role
        });
        res.status(200).json({ data: users });
    }
    catch (error) {
        next(error);
    }
};
exports.listUsers = listUsers;
const registerPushToken = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new api_error_1.ApiError(401, 'Unauthorized');
        }
        const result = await usersService.registerPushToken({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            token: req.body.token,
            platform: req.body.platform,
            deviceId: req.body.deviceId
        });
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.registerPushToken = registerPushToken;
const unregisterPushToken = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new api_error_1.ApiError(401, 'Unauthorized');
        }
        const result = await usersService.unregisterPushToken({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            token: req.body.token
        });
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.unregisterPushToken = unregisterPushToken;
const testPush = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new api_error_1.ApiError(401, 'Unauthorized');
        }
        const result = await usersService.sendTestPush({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            message: req.body.message
        });
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.testPush = testPush;
