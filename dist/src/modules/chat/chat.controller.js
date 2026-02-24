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
exports.uploadFile = exports.createConversation = exports.getMessages = exports.getConversations = void 0;
const chatService = __importStar(require("./chat.service"));
const api_error_1 = require("../../utils/api-error");
const getAuthContext = (req) => {
    if (!req.user) {
        throw new api_error_1.ApiError(401, 'Unauthorized');
    }
    return req.user;
};
const getConversations = async (req, res, next) => {
    try {
        const user = getAuthContext(req);
        const conversations = await chatService.getConversations({
            tenantId: user.tenantId,
            userId: user.id,
            role: user.role
        });
        res.status(200).json({ data: conversations });
    }
    catch (error) {
        next(error);
    }
};
exports.getConversations = getConversations;
const getMessages = async (req, res, next) => {
    try {
        const user = getAuthContext(req);
        const { id } = req.params;
        const { page, pageSize } = req.query;
        const result = await chatService.getMessages({
            tenantId: user.tenantId,
            userId: user.id,
            role: user.role,
            conversationId: id,
            page,
            pageSize
        });
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getMessages = getMessages;
const createConversation = async (req, res, next) => {
    try {
        const user = getAuthContext(req);
        const conversation = await chatService.createConversation({
            tenantId: user.tenantId,
            creatorId: user.id,
            participantIds: req.body.participantIds
        });
        res.status(201).json(conversation);
    }
    catch (error) {
        next(error);
    }
};
exports.createConversation = createConversation;
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new api_error_1.ApiError(400, 'file is required');
        }
        res.status(201).json({
            url: `/uploads/${req.file.filename}`,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadFile = uploadFile;
