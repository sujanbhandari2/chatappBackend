"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const api_error_1 = require("../utils/api-error");
const authorizeRoles = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new api_error_1.ApiError(401, 'Authentication required'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new api_error_1.ApiError(403, 'Forbidden for this role'));
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
