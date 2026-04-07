import crypto from 'node:crypto';
import { env } from '../config/env';

const ENCRYPTED_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/** Stored on `Message.contentEncryption` for new encrypted rows; use when decrypting. */
export const MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID = 'AES-256-GCM-v1' as const;

export type MessageContentEncryptionAlgorithmId = typeof MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID;

interface EncryptedPayloadV1 {
  v: 1;
  iv: string;
  ct: string;
  tag: string;
}

const getKey = (): Buffer => {
  const source = env.MESSAGE_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash('sha256').update(source, 'utf8').digest();
};

export const isEncryptedPayload = (content: string): boolean => {
  return content.startsWith(ENCRYPTED_PREFIX);
};

export const encryptMessageContent = (content: string): string => {
  if (!content) {
    return content;
  }

  if (isEncryptedPayload(content)) {
    return content;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayloadV1 = {
    v: 1,
    iv: iv.toString('base64'),
    ct: ciphertext.toString('base64'),
    tag: tag.toString('base64')
  };

  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return `${ENCRYPTED_PREFIX}${encoded}`;
};

const decryptAes256GcmV1 = (content: string): string => {
  const encoded = content.slice(ENCRYPTED_PREFIX.length);
  const raw = Buffer.from(encoded, 'base64').toString('utf8');
  const payload = JSON.parse(raw) as EncryptedPayloadV1;

  if (payload.v !== 1) {
    throw new Error('Unsupported encrypted message payload version');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ct, 'base64')),
    decipher.final()
  ]);

  return plaintext.toString('utf8');
};

/**
 * @param algorithmId Value from DB `content_encryption`; omit or null for legacy rows (still `enc:v1:` → AES-256-GCM-v1).
 */
export const decryptMessageContent = (content: string, algorithmId?: string | null): string => {
  if (!content || !isEncryptedPayload(content)) {
    return content;
  }

  const scheme =
    algorithmId?.trim() || MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID;

  if (scheme === MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID) {
    return decryptAes256GcmV1(content);
  }

  throw new Error(`Unsupported message encryption algorithm: ${scheme}`);
};
