"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketServer = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redis_adapter_1 = require("@socket.io/redis-adapter");
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const socket_auth_1 = require("./socket-auth");
const chat_gateway_1 = require("./chat.gateway");
const initializeSocketServer = async (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.env.FRONTEND_ORIGIN,
            credentials: true
        }
    });
    if (env_1.env.NODE_ENV !== 'test') {
        const pubClient = new ioredis_1.default(env_1.env.REDIS_URL);
        const subClient = pubClient.duplicate();
        pubClient.on('error', (error) => logger_1.logger.error('Socket Redis pub error', { error: error.message }));
        subClient.on('error', (error) => logger_1.logger.error('Socket Redis sub error', { error: error.message }));
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    }
    io.use((socket, next) => {
        try {
            const user = (0, socket_auth_1.extractSocketUser)(socket);
            socket.data.user = user;
            next();
        }
        catch (error) {
            next(error);
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }
        (0, chat_gateway_1.registerChatGateway)(io, socket, user);
    });
    return io;
};
exports.initializeSocketServer = initializeSocketServer;
