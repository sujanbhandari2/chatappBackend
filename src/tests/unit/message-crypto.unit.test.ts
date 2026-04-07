import {
  decryptMessageContent,
  encryptMessageContent,
  isEncryptedPayload,
  MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID
} from '../../utils/message-crypto';

describe('Message Crypto Unit', () => {
  it('encrypts and decrypts a text payload', () => {
    const plaintext = 'Hello encrypted world';
    const encrypted = encryptMessageContent(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(isEncryptedPayload(encrypted)).toBe(true);
    expect(decryptMessageContent(encrypted)).toBe(plaintext);
    expect(decryptMessageContent(encrypted, MESSAGE_CONTENT_ENCRYPTION_ALGORITHM_ID)).toBe(plaintext);
    expect(decryptMessageContent(encrypted, null)).toBe(plaintext);
  });

  it('passes through plaintext legacy content', () => {
    const plaintext = 'legacy-plaintext-message';
    expect(isEncryptedPayload(plaintext)).toBe(false);
    expect(decryptMessageContent(plaintext)).toBe(plaintext);
  });

  it('rejects unknown encryption algorithm id for encrypted payloads', () => {
    const encrypted = encryptMessageContent('x');
    expect(() => decryptMessageContent(encrypted, 'FUTURE-CIPHER-v9')).toThrow(
      'Unsupported message encryption algorithm'
    );
  });
});
