/**
 * Encryption Factory Tests
 *
 * Tests for AES-256-GCM encryption utility
 */

import {
  encrypt,
  decrypt,
  isEncrypted,
  parseEncryptedData,
  generateEncryptionKey,
  reEncrypt,
  getKeyVersion
} from '@/utils/encryption/EncryptionFactory';

describe('Encryption Factory', () => {
  // Set up test encryption key
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars = 32 bytes
  const testKeyV02 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = testKey;
    process.env.ENCRYPTION_KEY_V02 = testKeyV02;
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY_V02;
  });

  describe('encrypt()', () => {
    it('should encrypt plaintext and return formatted string', () => {
      const plaintext = 'ABC123456789';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(4);
    });

    it('should use default key version 01', () => {
      const encrypted = encrypt('test data');
      expect(encrypted.startsWith('01:')).toBe(true);
    });

    it('should use specified key version', () => {
      const encrypted = encrypt('test data', { keyVersion: '02' });
      expect(encrypted.startsWith('02:')).toBe(true);
    });

    it('should produce different ciphertext for same plaintext (different IVs)', () => {
      const plaintext = 'same text';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt empty string', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBeDefined();
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should encrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error if encryption key not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('Encryption key not found');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted data back to original plaintext', () => {
      const plaintext = 'Secret Passport Number: A1234567';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt data encrypted with different key versions', () => {
      const plaintext = 'Version test data';
      const encryptedV01 = encrypt(plaintext, { keyVersion: '01' });
      const encryptedV02 = encrypt(plaintext, { keyVersion: '02' });

      expect(decrypt(encryptedV01)).toBe(plaintext);
      expect(decrypt(encryptedV02)).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => decrypt('invalid:data')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('not:encrypted:at:all:extra')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('')).toThrow('Invalid encrypted data format');
    });

    it('should throw error for invalid key version format', () => {
      const invalidVersion = 'XX:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef:abcd';
      expect(() => decrypt(invalidVersion)).toThrow('Invalid key version format');
    });

    it('should throw error if decryption key not found', () => {
      // Create a valid encrypted format but with a key version that doesn't exist
      const invalidEncrypted = '99:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef:abcd';

      expect(() => decrypt(invalidEncrypted)).toThrow('Encryption key not found: ENCRYPTION_KEY_V99');
    });

    it('should throw error if auth tag verification fails (tampered data)', () => {
      const encrypted = encrypt('original data');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      parts[3] = parts[3].slice(0, -2) + 'FF';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('isEncrypted()', () => {
    it('should return true for encrypted data', () => {
      const encrypted = encrypt('test data');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(isEncrypted('plaintext')).toBe(false);
      expect(isEncrypted('123-45-6789')).toBe(false);
      expect(isEncrypted('ABC123')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for invalid encrypted format', () => {
      expect(isEncrypted('01:invalid')).toBe(false);
      expect(isEncrypted('not:encrypted:properly')).toBe(false);
      expect(isEncrypted('XX:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef:abcd')).toBe(false);
    });

    it('should validate format components', () => {
      // Valid: version:iv:authTag:ciphertext
      const valid = '01:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef:abcdef123456';
      expect(isEncrypted(valid)).toBe(true);

      // Invalid: wrong version length
      const invalidVersion = '1:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef:abcdef';
      expect(isEncrypted(invalidVersion)).toBe(false);

      // Invalid: wrong IV length
      const invalidIV = '01:0123:0123456789abcdef0123456789abcdef:abcdef';
      expect(isEncrypted(invalidIV)).toBe(false);

      // Invalid: wrong auth tag length
      const invalidAuth = '01:0123456789abcdef0123456789abcdef:0123:abcdef';
      expect(isEncrypted(invalidAuth)).toBe(false);
    });
  });

  describe('parseEncryptedData()', () => {
    it('should parse encrypted data into components', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const parsed = parseEncryptedData(encrypted);

      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('authTag');
      expect(parsed).toHaveProperty('ciphertext');

      expect(parsed.version).toBe('01');
      expect(parsed.iv.length).toBe(32); // 16 bytes = 32 hex chars
      expect(parsed.authTag.length).toBe(32); // 16 bytes = 32 hex chars
      expect(parsed.ciphertext.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseEncryptedData('invalid')).toThrow('Invalid encrypted data format');
      expect(() => parseEncryptedData('not:enough:parts')).toThrow('Invalid encrypted data format');
    });
  });

  describe('generateEncryptionKey()', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      const key3 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    it('generated key should work for encryption/decryption', () => {
      const newKey = generateEncryptionKey();
      const originalKey = process.env.ENCRYPTION_KEY;

      process.env.ENCRYPTION_KEY = newKey;

      const plaintext = 'test with new key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('reEncrypt()', () => {
    it('should re-encrypt data with new key version', () => {
      const plaintext = 'data to rotate';
      const encryptedV01 = encrypt(plaintext, { keyVersion: '01' });
      const encryptedV02 = reEncrypt(encryptedV01, '02');

      expect(encryptedV02.startsWith('02:')).toBe(true);
      expect(decrypt(encryptedV02)).toBe(plaintext);
    });

    it('should produce different ciphertext after re-encryption', () => {
      const plaintext = 'rotate me';
      const encryptedV01 = encrypt(plaintext, { keyVersion: '01' });
      const encryptedV02 = reEncrypt(encryptedV01, '02');

      expect(encryptedV01).not.toBe(encryptedV02);
      expect(decrypt(encryptedV01)).toBe(plaintext);
      expect(decrypt(encryptedV02)).toBe(plaintext);
    });

    it('should work for multiple rotation cycles', () => {
      process.env.ENCRYPTION_KEY_V03 = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const plaintext = 'multi-rotate';
      let encrypted = encrypt(plaintext, { keyVersion: '01' });

      encrypted = reEncrypt(encrypted, '02');
      expect(decrypt(encrypted)).toBe(plaintext);

      encrypted = reEncrypt(encrypted, '03');
      expect(decrypt(encrypted)).toBe(plaintext);

      delete process.env.ENCRYPTION_KEY_V03;
    });
  });

  describe('getKeyVersion()', () => {
    it('should return key version from encrypted data', () => {
      const encryptedV01 = encrypt('test', { keyVersion: '01' });
      const encryptedV02 = encrypt('test', { keyVersion: '02' });

      expect(getKeyVersion(encryptedV01)).toBe('01');
      expect(getKeyVersion(encryptedV02)).toBe('02');
    });
  });

  describe('Round-trip encryption/decryption', () => {
    const testCases = [
      { description: 'passport number', value: 'P1234567' },
      { description: 'driver license', value: 'DL-123-456-789' },
      { description: 'SSN', value: '123-45-6789' },
      { description: 'alien registration', value: 'A012345678' },
      { description: 'long text', value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10) },
      { description: 'numbers only', value: '1234567890' },
      { description: 'special chars', value: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
      { description: 'unicode', value: '测试数据 🔐 مفتاح التشفير' }
    ];

    testCases.forEach(({ description, value }) => {
      it(`should correctly encrypt and decrypt ${description}`, () => {
        const encrypted = encrypt(value);
        const decrypted = decrypt(encrypted);

        expect(decrypted).toBe(value);
        expect(isEncrypted(encrypted)).toBe(true);
        expect(isEncrypted(value)).toBe(false);
      });
    });
  });

  describe('Key validation', () => {
    it('should reject keys that are too short', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = '0123456789abcdef'; // Only 16 chars = 8 bytes

      expect(() => encrypt('test')).toThrow('Invalid encryption key length');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should reject keys that are too long', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = '0123456789abcdef'.repeat(10); // 160 chars = 80 bytes

      expect(() => encrypt('test')).toThrow('Invalid encryption key length');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should accept exactly 32-byte keys', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 chars = 32 bytes

      expect(() => encrypt('test')).not.toThrow();

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Security properties', () => {
    it('should use different IVs for each encryption (no IV reuse)', () => {
      const plaintext = 'same plaintext';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      const parsed1 = parseEncryptedData(encrypted1);
      const parsed2 = parseEncryptedData(encrypted2);

      expect(parsed1.iv).not.toBe(parsed2.iv);
    });

    it('should produce different ciphertexts for same plaintext (semantic security)', () => {
      const plaintext = 'predictable text';
      const ciphertexts = new Set();

      for (let i = 0; i < 10; i++) {
        const encrypted = encrypt(plaintext);
        ciphertexts.add(encrypted);
      }

      expect(ciphertexts.size).toBe(10);
    });

    it('should include authentication tag (authenticated encryption)', () => {
      const encrypted = encrypt('test');
      const parsed = parseEncryptedData(encrypted);

      expect(parsed.authTag).toBeDefined();
      expect(parsed.authTag.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should reject tampered ciphertext', () => {
      const encrypted = encrypt('important data');
      const parts = encrypted.split(':');

      // Tamper with last byte of ciphertext
      const lastChar = parts[3].slice(-1);
      const newChar = lastChar === 'a' ? 'b' : 'a';
      parts[3] = parts[3].slice(0, -1) + newChar;

      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should reject tampered IV', () => {
      const encrypted = encrypt('important data');
      const parts = encrypted.split(':');

      // Tamper with IV
      const firstChar = parts[1].slice(0, 1);
      const newChar = firstChar === 'a' ? 'b' : 'a';
      parts[1] = newChar + parts[1].slice(1);

      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });
});
