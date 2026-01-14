# Field-Level Encryption (ISS-011)

## Overview

The CadenceLMS API implements **field-level encryption** for sensitive personally identifiable information (PII) to comply with FERPA, GDPR, and other data protection regulations. This document describes the encryption system, how to use it, and how to manage encryption keys.

## What Gets Encrypted?

The following fields are automatically encrypted at rest using AES-256-GCM:

### Learner Data
1. **Identification Numbers** (`personExtended.identifications[].idNumber`)
   - Passport numbers
   - Driver's license numbers
   - State ID numbers
   - Student ID numbers
   - Any other government-issued identification

2. **Alien Registration Numbers** (`demographics.alienRegistrationNumber`)
   - A-numbers (format: A012345678)
   - Immigration identification numbers

### Staff Data
1. **Alien Registration Numbers** (`demographics.alienRegistrationNumber`)
   - Same as learner A-numbers

## Encryption Details

### Algorithm
- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes) - randomly generated for each encryption
- **Auth Tag Size**: 128 bits (16 bytes) - prevents tampering

### Format
Encrypted data is stored as a colon-separated string:
```
version:iv:authTag:ciphertext
```

Example:
```
01:a1b2c3d4e5f6...(:32 hex chars):d4e5f6g7h8i9...(:32 hex chars):encrypted_data
```

**Components:**
- `version` (2 digits): Key version for rotation (01, 02, 03, etc.)
- `iv` (32 hex chars): Initialization vector (16 bytes)
- `authTag` (32 hex chars): Authentication tag (16 bytes)
- `ciphertext` (variable hex): Encrypted data

### Security Properties
- **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity
- **Tamper Detection**: Any modification to ciphertext/IV/authTag causes decryption to fail
- **Semantic Security**: Same plaintext encrypts to different ciphertext (due to random IVs)
- **No IV Reuse**: New random IV generated for every encryption operation
- **Key Versioning**: Supports key rotation without data loss

## Setup

### 1. Generate Encryption Key

Generate a new 256-bit encryption key using OpenSSL:

```bash
openssl rand -hex 32
```

This produces a 64-character hexadecimal string like:
```
0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 2. Set Environment Variable

Add the key to your `.env` file:

```env
# Field-Level Encryption (ISS-011)
ENCRYPTION_KEY=YOUR_64_CHARACTER_HEX_KEY_HERE
```

**CRITICAL SECURITY:**
- ⚠️ **NEVER** commit encryption keys to version control
- ⚠️ **NEVER** share encryption keys via email, Slack, or other insecure channels
- ⚠️ Store production keys in a secure secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- ⚠️ Use different keys for development, staging, and production
- ⚠️ Rotate keys periodically (recommended: annually or when compromised)

### 3. Run Migration (Existing Data)

If you have existing plaintext data in your database, run the migration script:

```bash
# Dry run (test without making changes)
npm run migrate:encrypt-ids -- --dry-run

# Live run (encrypts data)
npm run migrate:encrypt-ids

# Custom batch size
npm run migrate:encrypt-ids -- --batch-size=50
```

The migration script:
- ✅ Is **idempotent** (safe to run multiple times)
- ✅ Skips already-encrypted data
- ✅ Processes data in batches to avoid memory issues
- ✅ Logs progress and errors
- ✅ Supports dry-run mode for testing

**IMPORTANT:** Backup your database before running the live migration!

## Usage

### Automatic Encryption (Recommended)

Encryption happens automatically via Mongoose pre-save hooks. Simply set the plaintext value and save:

```typescript
// Create learner with passport
const learner = await Learner.create({
  person: { /* ... */ },
  personExtended: {
    identifications: [{
      idType: 'passport',
      idNumber: 'P1234567',  // ← Plaintext
      issuingAuthority: 'US',
      // ...
    }]
  }
});

// idNumber is automatically encrypted before saving to database
// Stored as: "01:a1b2c3...:d4e5f6...:encrypted"
```

### Decryption

Use the `getDecryptedIdNumber()` method to decrypt identification numbers:

```typescript
// Retrieve learner
const learner = await Learner.findById(learnerId);

// Decrypt identification number
const identification = learner.personExtended.identifications[0];
const plaintext = identification.getDecryptedIdNumber();
console.log(plaintext); // "P1234567"
```

For alien registration numbers, decrypt manually:

```typescript
import { decrypt } from '@/utils/encryption/EncryptionFactory';

const learner = await Learner.findById(learnerId);
const encryptedANumber = learner.demographics.alienRegistrationNumber;
const plaintext = decrypt(encryptedANumber);
console.log(plaintext); // "A012345678"
```

### Manual Encryption/Decryption

For custom fields or one-off operations:

```typescript
import { encrypt, decrypt, isEncrypted } from '@/utils/encryption/EncryptionFactory';

// Encrypt
const plaintext = 'sensitive-data';
const encrypted = encrypt(plaintext);
console.log(encrypted); // "01:a1b2c3...:d4e5f6...:encrypted"

// Decrypt
const decrypted = decrypt(encrypted);
console.log(decrypted); // "sensitive-data"

// Check if encrypted
const isAlreadyEncrypted = isEncrypted(encrypted); // true
const isPlaintext = isEncrypted('plaintext'); // false
```

## Key Rotation

Key rotation allows you to re-encrypt data with a new key without losing access to old data.

### Why Rotate Keys?

- **Security Best Practice**: Limit exposure if a key is compromised
- **Compliance**: Some regulations require periodic key rotation
- **Separation of Duties**: Different keys for different environments/teams
- **Incident Response**: Rotate immediately if key is compromised

### How to Rotate Keys

#### 1. Generate New Key

```bash
openssl rand -hex 32
```

#### 2. Add New Key to Environment

Add the new key with the next version number:

```env
# Current key (version 01)
ENCRYPTION_KEY=old_key_here_64_chars...

# New key (version 02)
ENCRYPTION_KEY_V02=new_key_here_64_chars...
```

#### 3. Update Default Version (Optional)

If you want new encryptions to use the new key, update the default version in your code or create a new environment variable:

```typescript
const encrypted = encrypt(plaintext, { keyVersion: '02' });
```

#### 4. Re-encrypt Existing Data

Create a migration script to re-encrypt data with the new key:

```typescript
import { reEncrypt, getKeyVersion } from '@/utils/encryption/EncryptionFactory';

// Re-encrypt from version 01 to version 02
const oldEncrypted = learner.demographics.alienRegistrationNumber;
if (getKeyVersion(oldEncrypted) === '01') {
  learner.demographics.alienRegistrationNumber = reEncrypt(oldEncrypted, '02');
  await learner.save();
}
```

#### 5. Remove Old Key (After Migration)

After all data is re-encrypted and tested:

1. Verify no data uses old key version
2. Remove old key from environment
3. Update default key version

**IMPORTANT:** Keep old keys available until **all** data is re-encrypted!

## Testing

### Unit Tests

Encryption utility has comprehensive unit tests (45 tests):

```bash
npm test tests/unit/utils/encryption.test.ts
```

Tests cover:
- ✅ Basic encryption/decryption
- ✅ Key versioning
- ✅ Key rotation
- ✅ Security properties (no IV reuse, tamper detection)
- ✅ Edge cases (empty strings, unicode, special characters)
- ✅ Error handling

### Integration Tests

Mongoose hooks have integration tests (15 tests):

```bash
npm test tests/integration/encryption/field-encryption.test.ts
```

Tests cover:
- ✅ Automatic encryption on save
- ✅ Decryption methods
- ✅ Round-trip encryption/decryption
- ✅ Idempotent behavior (won't double-encrypt)
- ✅ Multiple identifications
- ✅ Edge cases (missing fields, validation)

## Troubleshooting

### Error: "Encryption key not found"

**Cause**: `ENCRYPTION_KEY` environment variable not set

**Solution**:
```bash
# Generate key
openssl rand -hex 32

# Add to .env
echo "ENCRYPTION_KEY=<your_key>" >> .env
```

### Error: "Invalid encryption key length"

**Cause**: Key is not exactly 64 hexadecimal characters (32 bytes)

**Solution**: Regenerate key with `openssl rand -hex 32`

### Error: "Invalid encrypted data format"

**Cause**: Data is not in expected format (version:iv:authTag:ciphertext)

**Possible Reasons:**
- Data is plaintext (not encrypted)
- Data was corrupted
- Data was manually edited

**Solution**: Re-encrypt the data or restore from backup

### Error: Decryption fails (auth tag verification)

**Cause**: Encrypted data was tampered with or corrupted

**Solution**:
- Check database integrity
- Restore from backup if corrupted
- Verify encryption key is correct

### Migration Shows "Already Encrypted" for All Records

**Cause**: Data is already encrypted (idempotent behavior)

**Solution**: This is normal if migration was already run. No action needed.

### Can't Decrypt After Key Rotation

**Cause**: Old encryption key was removed before re-encrypting all data

**Solution**:
- Restore old key (`ENCRYPTION_KEY_V01=...`)
- Re-run migration to re-encrypt with new key
- Then remove old key

## API Response Filtering

Encrypted fields are **automatically filtered** from API responses for security:

```typescript
// Database (encrypted)
{
  "personExtended": {
    "identifications": [{
      "idNumber": "01:a1b2c3...:d4e5f6...:encrypted"
    }]
  }
}

// API Response (filtered)
{
  "personExtended": {
    "identifications": [{
      // idNumber excluded for security
      "idType": "passport",
      "issuingAuthority": "US"
    }]
  }
}
```

**Decrypted values** are only returned when:
1. User has appropriate permissions
2. Request is from an internal service
3. User is accessing their own data (with explicit consent)

## Performance Considerations

### Encryption Overhead

- **CPU**: Minimal (AES-256-GCM is hardware-accelerated on modern CPUs)
- **Storage**: +50-100 bytes per encrypted field (IV + auth tag + version)
- **Query Performance**: Encrypted fields **cannot** be indexed or searched

### Database Queries

You **cannot** query by encrypted fields:

```typescript
// ❌ This will NOT work
const learner = await Learner.findOne({
  'personExtended.identifications.idNumber': 'P1234567'
});

// ✅ Query by unencrypted fields, then decrypt in-memory
const learners = await Learner.find({
  'personExtended.identifications.idType': 'passport'
});

const matchingLearner = learners.find(l => {
  const id = l.personExtended.identifications[0];
  return id.getDecryptedIdNumber() === 'P1234567';
});
```

### Recommendations

- Index by `idType`, `issuingAuthority`, etc. (unencrypted metadata)
- Use external ID fields (e.g., student ID) for lookups if needed
- Cache decrypted values in-memory if accessed frequently (never persist)

## Compliance & Audit

### FERPA Compliance

Field-level encryption helps meet FERPA requirements for protecting:
- Social Security Numbers
- Student ID numbers
- Other sensitive identifiers

### GDPR Compliance

Encryption supports GDPR's:
- **Data Minimization**: Only encrypt what's necessary
- **Security by Design**: Encryption at rest
- **Breach Notification**: Encrypted data is less sensitive if breached

### Audit Logging

All encryption/decryption operations should be logged for audit trails:

```typescript
logger.info('Encrypted ID number', {
  userId: learner._id,
  idType: 'passport',
  action: 'encrypt'
});

logger.info('Decrypted ID number', {
  userId: learner._id,
  idType: 'passport',
  action: 'decrypt',
  requestedBy: currentUser._id
});
```

## Security Best Practices

### DO ✅

- ✅ Generate keys using cryptographically secure random number generators
- ✅ Store production keys in a secrets manager (AWS Secrets Manager, Vault, etc.)
- ✅ Use different keys for dev, staging, and production
- ✅ Rotate keys annually or when compromised
- ✅ Backup database before running migrations
- ✅ Test key rotation in staging before production
- ✅ Log all decryption operations for audit trails
- ✅ Limit access to decryption operations (role-based access control)
- ✅ Monitor for unusual decryption patterns

### DON'T ❌

- ❌ **NEVER** commit encryption keys to version control
- ❌ **NEVER** share keys via email, Slack, or insecure channels
- ❌ **NEVER** use the same key across environments
- ❌ **NEVER** reuse keys after compromise
- ❌ **NEVER** log plaintext sensitive data
- ❌ **NEVER** store decrypted values in cache/session storage
- ❌ **NEVER** send plaintext sensitive data to frontend unnecessarily
- ❌ **NEVER** query by encrypted field values
- ❌ **NEVER** use weak/predictable keys (like "test", "password", etc.)

## Architecture

### Encryption Factory Pattern

The `EncryptionFactory` provides reusable encryption utilities:

```typescript
// Core functions
encrypt(plaintext, options?)
decrypt(encryptedData)
isEncrypted(value)

// Mongoose helpers
encryptFieldIfModified(fieldName)  // Pre-save hook
createDecryptMethod(fieldName)     // Decryption method
createDecryptedGetter(fieldName)   // Virtual getter

// Key rotation
reEncrypt(encryptedData, newKeyVersion)
getKeyVersion(encryptedData)
```

### Mongoose Integration

Encryption hooks are added at the schema level:

```typescript
// identificationSchema
IdentificationSchema.pre('save', encryptFieldIfModified('idNumber'));
IdentificationSchema.methods.getDecryptedIdNumber = createDecryptMethod('idNumber');

// DemographicsSchema
DemographicsSchema.pre('save', encryptFieldIfModified('alienRegistrationNumber'));
```

This ensures:
- Automatic encryption on save
- Idempotent behavior (won't double-encrypt)
- Transparent decryption via methods

## Future Enhancements

Potential improvements for future releases:

1. **Searchable Encryption**: Implement deterministic encryption for select fields that need to be searchable
2. **Hardware Security Modules (HSM)**: Integrate with HSM for key storage
3. **Automatic Key Rotation**: Scheduled background job to rotate keys
4. **Field-Level Access Control**: Granular permissions for who can decrypt which fields
5. **Encryption at Column Level**: Database-level encryption (e.g., MongoDB CSFLE)
6. **Key Management Service (KMS)**: Integration with AWS KMS, Azure Key Vault, etc.

## Support

For questions or issues related to encryption:

1. Check this documentation first
2. Review troubleshooting section
3. Check test files for examples
4. Create an issue on GitHub with details:
   - Error message
   - Stack trace
   - Environment (dev/staging/prod)
   - Steps to reproduce
   - **NEVER include actual encryption keys in issues!**

## References

- [AES-GCM Specification (NIST SP 800-38D)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [FERPA Compliance](https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html)
- [GDPR Encryption Requirements](https://gdpr.eu/encryption/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-13
**Related Issues**: ISS-011
