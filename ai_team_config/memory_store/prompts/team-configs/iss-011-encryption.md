# Team Config: ISS-011 PII Encryption

**ID:** P-TEAM-001
**Type:** team-config
**Version:** 1.0
**Created:** 2026-01-27
**Status:** Active
**Priority:** Critical
**Tags:** #prompt #team-config #security #encryption

## Team

| Field | Value |
|-------|-------|
| Name | ISS-011: Encrypt Identification Numbers at Rest |
| Issue | ISS-011 |
| Type | Security |
| Assigned To | API Agent |

## Purpose

**CRITICAL SECURITY:** Implement AES-256-GCM encryption for sensitive PII (passport, driver's license, SSN, alien registration numbers).

## Context

The `IIdentification.idNumber` field stores sensitive PII in plain text. This is a critical security and compliance risk (FERPA, GDPR).

### Risks
- Database breach exposes PII (passports, driver's licenses)
- FERPA/GDPR compliance violations
- Backup tapes contain plain text PII
- Legal liability and fines

### Fields to Encrypt
- `IIdentification.idNumber` (passport, driver's license, state ID)
- `IDemographics.alienRegistrationNumber` (A-number)
- Future: SSN, tax ID, other sensitive identifiers

## Agent

| Field | Value |
|-------|-------|
| ID | agent-iss-011 |
| Role | Security Engineer - PII Encryption |
| Capabilities | AES-256-GCM, key rotation, Mongoose hooks, migration scripts, security testing |

## Workflow

1. **Design:** Create encryption factory with AES-256-GCM
2. **Utility:** Implement encrypt/decrypt with key versioning
3. **Factory:** Create field encryption decorators/helpers
4. **Schema:** Integrate with Mongoose pre-save hooks
5. **Test:** Comprehensive unit and integration tests
6. **Migration:** Script to encrypt existing plain text data
7. **Documentation:** Key management and rotation procedures
8. **Verification:** Confirm encrypted data in database

## Security Requirements

### Encryption
| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key Length | 256 bits |
| IV Length | 16 bytes |
| Auth Tag Length | 16 bytes |
| Format | `version:iv:authTag:ciphertext` |

### Key Management
- **Storage:** Environment variables or secrets manager
- **Never:** Source code, Git repos, Docker images, config files in VCS
- **Development:** `.env.local` (gitignored)
- **Production:** AWS Secrets Manager / HashiCorp Vault / Azure Key Vault

### Key Rotation
- Supported with version format: 01, 02, 03...
- Backward compatible
- Process: New key version → Re-encrypt data → Deprecate old key

## Key Files

| Purpose | File |
|---------|------|
| Encryption | `src/utils/encryption/EncryptionFactory.ts` (new) |
| Schema | `src/models/auth/PersonExtended.types.ts` |
| Migration | `scripts/migrations/encrypt-identification-numbers.ts` (new) |
| Tests | `tests/unit/utils/encryption.test.ts` (new) |
| Env Example | `.env.example` |
| Docs | `devdocs/ENCRYPTION.md` (new) |

## Implementation Checklist

### Encryption Utility
- [ ] Create `src/utils/encryption/EncryptionFactory.ts`
- [ ] Implement AES-256-GCM `encrypt()` function
- [ ] Implement `decrypt()` with version support
- [ ] Implement `isEncrypted()` validation
- [ ] Add key versioning support
- [ ] Handle missing key errors gracefully
- [ ] Add comprehensive JSDoc documentation

### Schema Integration
- [ ] Add pre-save hook to IdentificationSchema
- [ ] Encrypt idNumber if modified and not already encrypted
- [ ] Add virtual/method for decrypted access
- [ ] Test with Mongoose save/update operations
- [ ] Ensure backwards compatibility with plain text (migration phase)

### Testing
- [ ] Unit tests: encrypt/decrypt round-trip
- [ ] Unit tests: key versioning and rotation
- [ ] Unit tests: isEncrypted validation
- [ ] Unit tests: error handling (missing key)
- [ ] Integration tests: Mongoose save → read → decrypt
- [ ] Integration tests: verify encrypted format in DB
- [ ] Test migration script idempotency

### Migration
- [ ] Create `scripts/migrations/encrypt-identification-numbers.ts`
- [ ] Backup reminder before running
- [ ] Idempotent (safe to re-run)
- [ ] Progress logging
- [ ] Error handling and rollback strategy
- [ ] Dry-run mode for testing

### Documentation
- [ ] Update `.env.example` with ENCRYPTION_KEY
- [ ] Document key generation (`openssl rand -hex 32`)
- [ ] Document key rotation process
- [ ] Add security notes to PersonExtended.types.ts
- [ ] Create `devdocs/ENCRYPTION.md` guide
- [ ] Update README with encryption setup

## Context Files

**Always read:**
- `src/models/auth/PersonExtended.types.ts`
- `src/models/auth/Demographics.types.ts`

**Review:**
- `agent_coms/ui/ISSUE_QUEUE.md` (ISS-011 specification)

## Links

- Prompt registry: [[../prompt-registry]]
- Team configs index: [[index]]
- Original: `.claude/team-config.json`
