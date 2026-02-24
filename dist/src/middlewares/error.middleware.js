"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const client_1 = require("@prisma/client");
const api_error_1 = require("../utils/api-error");
const env_1 = require("../config/env");
const notFoundHandler = (_req, _res, next) => {
    next(new api_error_1.ApiError(404, 'Route not found'));
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, _req, res, _next) => {
    if (error instanceof api_error_1.ApiError) {
        res.status(error.statusCode).json({
            message: error.message,
            details: env_1.env.NODE_ENV === 'production' ? undefined : error.details
        });
        return;
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        res.status(400).json({ message: error.message, code: error.code });
        return;
    }
    if (error instanceof Error) {
        res.status(500).json({ message: error.message });
        return;
    }
    res.status(500).json({ message: 'Internal server error' });
};
exports.errorHandler = errorHandler;
