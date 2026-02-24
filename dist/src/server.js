"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const prisma_1 = require("./config/prisma");
const websocket_1 = require("./websocket");
const bootstrap = async () => {
    await prisma_1.prisma.$connect();
    const app = (0, app_1.createApp)();
    const httpServer = node_http_1.default.createServer(app);
    await (0, websocket_1.initializeSocketServer)(httpServer);
    httpServer.listen(env_1.env.PORT, () => {
        logger_1.logger.info(`Backend listening on port ${env_1.env.PORT}`);
    });
    const shutdown = async () => {
        logger_1.logger.info('Shutting down backend');
        httpServer.close(async () => {
            await prisma_1.prisma.$disconnect();
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};
bootstrap().catch(async (error) => {
    logger_1.logger.error('Failed to bootstrap backend', { error: error instanceof Error ? error.message : String(error) });
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
