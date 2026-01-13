# 🚨 BREAKING CHANGES: Person Data Architecture v2.0

**From:** API Team
**To:** UI Team
**Date:** 2026-01-12
**Priority:** HIGH
**Type:** Breaking Changes Notification

---

## Summary

The API is implementing **BREAKING CHANGES** to the person data structure. The flat `firstName`, `lastName`, `phone`, `profileImage` fields are being replaced with a **three-layer person architecture** that provides better data organization, compliance support, and extensibility.

**Timeline:** Implementation in progress, will be complete within next phase
**Action Required:** UI must update all references to person data

---

## What Changed

### 🔴 BREAKING: Flat Fields → Nested Person Structure

**Before (v1.0.0):**
```typescript
GET /api/v2/users/me
{
  "success": true,
  "data": {
    "id": "...",
    "email": "john@example.com",
    "firstName": "John",           // ❌ REMOVED
    "lastName": "Doe",              // ❌ REMOVED
    "phone": "+1-555-0123",         // ❌ REMOVED
    "profileImage": "https://...",  // ❌ REMOVED
    "role": "staff",
    "departments": [...]
  }
}
```

**After (v2.0.0):**
```typescript
GET /api/v2/users/me
{
  "success": true,
  "data": {
    "id": "...",
    "email": "john@example.com",
    "role": "staff",
    "person": {                     // ✅ NEW: Nested person object
      "firstName": "John",
      "lastName": "Doe",
      "middleName": null,
      "preferredFirstName": null,   // ✅ NEW
      "preferredLastName": null,    // ✅ NEW
      "pronouns": "he/him",          // ✅ NEW
      "emails": [{                   // ✅ NEW: Multiple emails
        "email": "john@example.com",
        "type": "institutional",
        "isPrimary": true,
        "verified": true,
        "allowNotifications": true
      }],
      "phones": [{                   // ✅ NEW: Multiple phones
        "number": "+1-555-0123",
        "type": "mobile",
        "isPrimary": true,
        "verified": true,
        "allowSMS": true
      }],
      "addresses": [],               // ✅ NEW: Multiple addresses
      "avatar": "https://...",       // ✅ NEW: Was profileImage
      "bio": "...",
      "timezone": "America/New_York",
      "languagePreference": "en"
    },
    "departments": [...]
  }
}
```

---

## Migration Guide for UI Team

### Step 1: Update GET /users/me Response Handling

```typescript
// ❌ OLD CODE (will break)
const user = response.data;
const fullName = `${user.firstName} ${user.lastName}`;
const phone = user.phone;
const avatar = user.profileImage;

// ✅ NEW CODE
const user = response.data;
const fullName = `${user.person.firstName} ${user.person.lastName}`;
const phone = user.person.phones[0]?.number || null; // Get primary phone
const avatar = user.person.avatar;

// ✅ BETTER: Use helper functions
import { getDisplayName, getPrimaryPhone, getPrimaryEmail } from '@/api/person-helpers';

const displayName = getDisplayName(user.person); // Handles preferred names
const phone = getPrimaryPhone(user.person)?.number;
const email = getPrimaryEmail(user.person)?.email;
```

### Step 2: Field Migration Table

| Old Field (v1.0) | New Field (v2.0) | Notes |
|------------------|------------------|-------|
| `data.firstName` | `data.person.firstName` | Legal first name |
| `data.lastName` | `data.person.lastName` | Legal last name |
| `data.phone` | `data.person.phones[0].number` | Now array, find isPrimary |
| `data.profileImage` | `data.person.avatar` | Renamed |
| N/A | `data.person.preferredFirstName` | NEW: Chosen name |
| N/A | `data.person.preferredLastName` | NEW |
| N/A | `data.person.pronouns` | NEW: she/her, he/him, etc. |
| N/A | `data.person.emails[]` | NEW: Multiple emails |
| N/A | `data.person.phones[]` | NEW: Multiple phones |
| N/A | `data.person.addresses[]` | NEW: Multiple addresses |
| N/A | `data.person.timezone` | NEW: IANA timezone |
| N/A | `data.person.languagePreference` | NEW: ISO 639-1 code |

### Step 3: Update Form Components

**Profile Edit Form:**
```typescript
// ❌ OLD
<input name="firstName" value={user.firstName} />
<input name="lastName" value={user.lastName} />
<input name="phone" value={user.phone} />

// ✅ NEW
<input name="firstName" value={user.person.firstName} />
<input name="lastName" value={user.person.lastName} />

{/* Phones are now an array */}
{user.person.phones.map((phone, index) => (
  <div key={index}>
    <input value={phone.number} />
    <select value={phone.type}>
      <option value="mobile">Mobile</option>
      <option value="home">Home</option>
      <option value="work">Work</option>
    </select>
    <label>
      <input type="checkbox" checked={phone.isPrimary} />
      Primary
    </label>
  </div>
))}

{/* NEW: Preferred name support */}
<input
  name="preferredFirstName"
  value={user.person.preferredFirstName || ''}
  placeholder="Preferred first name (optional)"
/>

{/* NEW: Pronouns support */}
<input
  name="pronouns"
  value={user.person.pronouns || ''}
  placeholder="Pronouns (e.g., she/her, he/him, they/them)"
/>
```

---

## New Endpoints Available

### 1. GET /api/v2/users/me/person
Get full person data (IPerson Basic)

**Response:**
```typescript
{
  "success": true,
  "data": {
    "firstName": "...",
    "lastName": "...",
    "emails": [...],
    "phones": [...],
    "addresses": [...],
    "communicationPreferences": {...},
    "legalConsent": {...}
    // Full IPerson structure
  }
}
```

**Use Case:** Profile pages, contact information forms

---

### 2. PUT /api/v2/users/me/person
Update person data

**Request:**
```typescript
{
  "preferredFirstName": "Johnny",
  "pronouns": "he/him",
  "phones": [
    {
      "number": "+1-555-0123",
      "type": "mobile",
      "isPrimary": true,
      "verified": false,
      "allowSMS": true
    }
  ],
  "communicationPreferences": {
    "preferredMethod": "email",
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "notificationFrequency": "daily-digest"
  }
}
```

**Use Case:** Profile edit, preferences settings

---

### 3. GET /api/v2/users/me/person/extended
Get role-specific extended person data

**Response (Learner):**
```typescript
{
  "success": true,
  "data": {
    "role": "learner",
    "learner": {
      "studentId": "STU123456",
      "emergencyContacts": [{
        "fullName": "Mary Smith",
        "relationship": "Mother",
        "primaryPhone": "+1-555-1234",
        "priority": 1,
        "medicalAuthorization": true
      }],
      "accommodations": [...],
      "housingStatus": "on-campus",
      "residenceHall": "Adams Hall",
      "roomNumber": "312",
      // ... more learner-specific fields
    }
  }
}
```

**Response (Staff):**
```typescript
{
  "success": true,
  "data": {
    "role": "staff",
    "staff": {
      "professionalTitle": "Associate Professor",
      "officeLocation": "Building A, Room 123",
      "credentials": [...],
      "publications": [...],
      "officeHours": [...],
      "linkedInUrl": "...",
      // ... more staff-specific fields
    }
  }
}
```

**Use Case:** Extended profile pages, staff directory, student records

---

### 4. PUT /api/v2/users/me/person/extended
Update extended person data

**Request (Learner):**
```typescript
{
  "emergencyContacts": [{
    "fullName": "Mary Smith",
    "relationship": "Mother",
    "primaryPhone": "+1-555-1234",
    "email": "mary@example.com",
    "priority": 1
  }],
  "housingStatus": "on-campus",
  "residenceHall": "Adams Hall",
  "roomNumber": "312"
}
```

**Use Case:** Student profile management, emergency contact forms

---

### 5. GET /api/v2/users/me/demographics
Get demographics data (compliance/reporting)

**Response:**
```typescript
{
  "success": true,
  "data": {
    "legalGender": "female",
    "pronouns": "she/her",
    "isHispanicLatino": false,
    "race": ["asian", "white"],
    "citizenship": "us-citizen",
    "veteranStatus": "not-veteran",
    "firstGenerationStudent": false,
    "hasDisability": false,
    "primaryLanguage": "en",
    "englishProficiency": "native",
    "allowReporting": true,  // User consent
    "allowResearch": true    // User consent
  }
}
```

**Use Case:** Demographics forms, compliance reporting

---

### 6. PUT /api/v2/users/me/demographics
Update demographics data

**IMPORTANT:** UI MUST include clear consent checkboxes:
- "I consent to use this data for institutional reporting"
- "I consent to use this data for research"

**Request:**
```typescript
{
  "isHispanicLatino": false,
  "race": ["asian", "white"],
  "citizenship": "us-citizen",
  "firstGenerationStudent": false,
  "primaryLanguage": "en",
  "allowReporting": true,
  "allowResearch": true
}
```

**Use Case:** Demographics collection forms

---

## New Features Available

### 1. Preferred Names
Users can now specify preferred first/last names (for chosen names, nicknames)

**UI Recommendation:**
- Display preferredName if set, otherwise use legal name
- Use `getDisplayName()` helper function

### 2. Pronouns
Track and display user pronouns (she/her, he/him, they/them, etc.)

**UI Recommendation:**
- Show pronouns in user profile cards
- Include in staff directory listings
- Respect user's pronoun choices in all communications

### 3. Multiple Contact Methods
- Multiple emails (institutional, personal, work)
- Multiple phones (mobile, home, work)
- Multiple addresses (home, work, mailing)

**UI Recommendation:**
- Allow users to manage contact list
- Show primary contact in summary views
- Allow adding/removing/editing multiple entries

### 4. Communication Preferences
Users can set:
- Preferred contact method (email, phone, SMS)
- Quiet hours (no notifications 22:00-08:00)
- Notification frequency (immediate, daily digest, weekly digest)

**UI Recommendation:**
- Add "Notification Preferences" section to settings
- Respect quiet hours in notification scheduling

### 5. Legal Consent Tracking
Track consent for:
- FERPA directory information
- GDPR data processing
- Photography/media
- Marketing communications
- Third-party data sharing

**UI Recommendation:**
- Show consent history with dates
- Allow users to update consent choices
- Provide clear explanations for each consent type

### 6. Emergency Contacts (Learners)
Learners can add emergency contacts with:
- Priority ordering
- Medical authorization
- Pickup authorization

**UI Recommendation:**
- Encourage students to keep emergency contacts updated
- Warn if no emergency contacts on file
- Allow easy editing/reordering

### 7. Demographics Collection
Comprehensive demographics for:
- IPEDS reporting
- Title IX compliance
- ADA compliance
- First-generation student support

**UI Recommendation:**
- Clear explanation of why data is collected
- All fields optional (respect privacy)
- Explicit consent checkboxes
- "prefer-not-to-say" options

---

## Helper Functions (Recommended)

Create a `person-helpers.ts` file with these utilities:

```typescript
import type { IPerson, IEmail, IPhone, IAddress } from '@/api/types';

/**
 * Get primary email or first email
 */
export function getPrimaryEmail(person: IPerson): IEmail | undefined {
  return person.emails.find(e => e.isPrimary) || person.emails[0];
}

/**
 * Get primary phone or first phone
 */
export function getPrimaryPhone(person: IPerson): IPhone | undefined {
  return person.phones.find(p => p.isPrimary) || person.phones[0];
}

/**
 * Get primary address or first address
 */
export function getPrimaryAddress(person: IPerson): IAddress | undefined {
  return person.addresses.find(a => a.isPrimary) || person.addresses[0];
}

/**
 * Get display name (prefers preferred name over legal name)
 */
export function getDisplayName(person: IPerson): string {
  const firstName = person.preferredFirstName || person.firstName;
  const lastName = person.preferredLastName || person.lastName;
  return `${firstName} ${lastName}`.trim();
}

/**
 * Get full legal name
 */
export function getFullLegalName(person: IPerson): string {
  const parts = [
    person.firstName,
    person.middleName,
    person.lastName,
    person.suffix
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: IPhone): string {
  // Simple US format: +1-555-123-4567 → (555) 123-4567
  const cleaned = phone.number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone.number;
}
```

---

## Testing Checklist

### Profile Pages
- [ ] User profile displays name correctly (preferredName if set)
- [ ] Avatar displays from `person.avatar`
- [ ] Phone displays from `person.phones` array
- [ ] Email displays from `person.emails` array
- [ ] Pronouns display if set
- [ ] Bio displays correctly

### Profile Edit Forms
- [ ] Can edit firstName, lastName, middleName
- [ ] Can set/edit preferredFirstName, preferredLastName
- [ ] Can set/edit pronouns
- [ ] Can add/edit/remove phone numbers
- [ ] Can mark one phone as primary
- [ ] Can add/edit/remove email addresses
- [ ] Can mark one email as primary
- [ ] Can add/edit/remove addresses
- [ ] Can mark one address as primary
- [ ] Can edit avatar URL
- [ ] Can edit bio
- [ ] Can set timezone
- [ ] Can set language preference

### Settings Pages
- [ ] Communication preferences form works
- [ ] Can set preferred contact method
- [ ] Can set quiet hours
- [ ] Can set notification frequency
- [ ] Legal consent toggles work
- [ ] Consent dates display correctly

### Extended Profile (Learners)
- [ ] Emergency contacts display correctly
- [ ] Can add/edit/remove emergency contacts
- [ ] Can reorder emergency contacts by priority
- [ ] Housing information displays
- [ ] Accommodations list displays
- [ ] Prior education displays

### Extended Profile (Staff)
- [ ] Professional title displays
- [ ] Office location displays
- [ ] Credentials list displays
- [ ] Publications list displays
- [ ] Office hours display
- [ ] Professional links display

### Demographics Forms
- [ ] Consent checkboxes present and required
- [ ] Clear explanation of data usage
- [ ] All fields optional
- [ ] "Prefer not to say" options available
- [ ] Can select multiple race categories
- [ ] Form saves correctly

---

## Breaking Changes Impact Assessment

### High Impact (Immediate Action Required)
1. **Profile Display Components** - All references to `firstName`, `lastName`, `phone`, `profileImage`
2. **Profile Edit Forms** - Update field bindings to nested `person` object
3. **User Cards/Lists** - Any summary views showing user info
4. **Navigation Bar** - User name display in header

### Medium Impact (Action Required Soon)
1. **Staff Directory** - Add pronouns, preferred names
2. **Student Records** - Emergency contacts, accommodations
3. **Settings Pages** - Communication preferences, legal consent
4. **Search/Filters** - Update filters to use new structure

### Low Impact (Enhancement Opportunities)
1. **Demographics Collection** - New compliance forms
2. **Extended Profiles** - Staff credentials, publications
3. **Advanced Preferences** - Quiet hours, notification frequency

---

## Timeline

- **Phase 1 (Current):** Type definitions and contracts complete ✅
- **Phase 2 (Next):** API implementation (models, services, endpoints)
- **Phase 3:** Testing and validation
- **Phase 4:** Deployment

**Recommendation:** UI team should start migration work now using the new contracts as reference. API will be backward-compatible temporarily during transition period.

---

## Questions?

Contact API team if you need:
- TypeScript type definitions
- Example migration code
- Clarification on any endpoints
- Help with testing

---

## Contract References

See these files for complete contract details:
- `contracts/api/users.contract.ts` (v2.0.0 - UPDATED)
- `contracts/api/person.contract.ts` (NEW)
- `contracts/api/demographics.contract.ts` (NEW)

---

**This is a critical breaking change. Please prioritize UI migration work.**

✅ Type definitions complete
✅ Contracts documented
⏳ API implementation in progress
⚠️ UI migration required
