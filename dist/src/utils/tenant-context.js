"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantContext = exports.runWithTenantContext = void 0;
const node_async_hooks_1 = require("node:async_hooks");
const storage = new node_async_hooks_1.AsyncLocalStorage();
const runWithTenantContext = (state, callback) => {
    return storage.run(state, callback);
};
exports.runWithTenantContext = runWithTenantContext;
const getTenantContext = () => {
    return storage.getStore() ?? {};
};
exports.getTenantContext = getTenantContext;
