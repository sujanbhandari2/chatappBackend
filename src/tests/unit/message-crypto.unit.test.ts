import { decryptMessageContent, encryptMessageContent, isEncryptedPayload } from '../../utils/message-crypto';

describe('Message Crypto Unit', () => {
  it('encrypts and decrypts a text payload', () => {
    const plaintext = 'Hello encrypted world';
    const encrypted = encryptMessageContent(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(isEncryptedPayload(encrypted)).toBe(true);
    expect(decryptMessageContent(encrypted)).toBe(plaintext);
  });

  it('passes through plaintext legacy content', () => {
    const plaintext = 'legacy-plaintext-message';
    expect(isEncryptedPayload(plaintext)).toBe(false);
    expect(decryptMessageContent(plaintext)).toBe(plaintext);
  });
});
