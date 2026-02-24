"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptMessageContent = exports.encryptMessageContent = exports.isEncryptedPayload = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const env_1 = require("../config/env");
const ENCRYPTED_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const getKey = () => {
    const source = env_1.env.MESSAGE_ENCRYPTION_KEY || env_1.env.JWT_SECRET;
    return node_crypto_1.default.createHash('sha256').update(source, 'utf8').digest();
};
const isEncryptedPayload = (content) => {
    return content.startsWith(ENCRYPTED_PREFIX);
};
exports.isEncryptedPayload = isEncryptedPayload;
const encryptMessageContent = (content) => {
    if (!content) {
        return content;
    }
    if ((0, exports.isEncryptedPayload)(content)) {
        return content;
    }
    const iv = node_crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = node_crypto_1.default.createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = {
        v: 1,
        iv: iv.toString('base64'),
        ct: ciphertext.toString('base64'),
        tag: tag.toString('base64')
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    return `${ENCRYPTED_PREFIX}${encoded}`;
};
exports.encryptMessageContent = encryptMessageContent;
const decryptMessageContent = (content) => {
    if (!content || !(0, exports.isEncryptedPayload)(content)) {
        return content;
    }
    const encoded = content.slice(ENCRYPTED_PREFIX.length);
    const raw = Buffer.from(encoded, 'base64').toString('utf8');
    const payload = JSON.parse(raw);
    if (payload.v !== 1) {
        throw new Error('Unsupported encrypted message payload version');
    }
    const decipher = node_crypto_1.default.createDecipheriv(ALGORITHM, getKey(), Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.ct, 'base64')),
        decipher.final()
    ]);
    return plaintext.toString('utf8');
};
exports.decryptMessageContent = decryptMessageContent;
