"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const chat_routes_1 = __importDefault(require("./modules/chat/chat.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const tenants_routes_1 = __importDefault(require("./modules/tenants/tenants.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const createApp = () => {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: env_1.env.FRONTEND_ORIGIN,
        credentials: true
    }));
    app.use((0, morgan_1.default)(env_1.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    app.use(express_1.default.json({ limit: '5mb' }));
    app.use('/uploads', express_1.default.static(node_path_1.default.resolve(process.cwd(), env_1.env.UPLOAD_DIR)));
    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api', chat_routes_1.default);
    app.use('/api/users', users_routes_1.default);
    app.use('/api/tenants', tenants_routes_1.default);
    app.use(error_middleware_1.notFoundHandler);
    app.use(error_middleware_1.errorHandler);
    return app;
};
exports.createApp = createApp;
