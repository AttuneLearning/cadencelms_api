# ISS-010: Clarifying Questions - Answered

> **Date:** 2026-01-13
> **Respondent:** Human (Project Owner)
> **Status:** All questions answered - Ready for implementation

---

## Question 1: Auto-save vs Manual Save

**Question:** Should each section auto-save on blur, or have a "Save" button per section?

**Answer:** ✅ **Auto-save on blur**

**Implementation Notes:**
- Fields save automatically when user clicks away (on blur event)
- Show brief "Saving..." → "Saved ✓" indicator
- No explicit Save button needed per section
- Debounce rapid changes (e.g., 500ms delay)

---

## Question 2: Parent/Guardian Visibility

**Question:** Should parent/guardian section be hidden for learners over 18?

**Answer:** ✅ **Allow manual "Show this section" toggle**

**Implementation Notes:**
- Section 2.3 (Parent/Guardian Information) includes a toggle control
- Default: Hidden for learners age 18+ (based on dateOfBirth)
- User can click "Show Parent/Guardian Section" to reveal and fill out
- Useful for learners who want to provide emergency contacts or financial aid purposes

---

## Question 3: Accommodations Edit Access

**Question:** Can learners edit their own accommodations, or is this admin-only?

**Answer:** ✅ **Learners can VIEW existing accommodations and REQUEST new ones (add only). Department-Admins can Add new accommodations or Edit existing accommodations.**

**Implementation Notes:**
- **Learner Profile View (Section 2.6):**
  - VIEW: Display all existing accommodations (readonly)
  - REQUEST: "Request New Accommodation" button opens form (add only)
  - Cannot edit or delete existing accommodations
- **Department-Admin View:**
  - Full CRUD access: Add, Edit, Delete accommodations for learners in their department
  - Can approve/deny learner requests
  - Can update existing accommodation details

**Access Control:**
- Learner: `GET /api/v2/users/me/accommodations`, `POST /api/v2/users/me/accommodations/request`
- Dept Admin: `GET /api/v2/departments/{id}/learners/{id}/accommodations`, `POST/PUT/DELETE`

---

## Question 4: ID Number Storage

**Question:** Is the API ready to accept/return encrypted ID numbers?

**Answer:** ✅ **API will encrypt/decrypt all ID numbers at rest. UI must implement masking display logic.**

**Implementation Notes:**
- **API Responsibility:**
  - Encrypts ID numbers before storing in database
  - Decrypts when serving to authorized users
  - Returns full value to UI on GET (UI has authorization to view)

- **UI Responsibility:**
  - Implement masking for display: Show only last 4 digits as "••••••1234"
  - Input field: Allow full entry but mask as user types (e.g., show last 4 only)
  - On save: Send full value to API, API handles encryption
  - Security: Clear from memory after save, don't cache unmasked values

**Affected Fields (Section 2.4):**
- `idNumber` in Identification Documents
- All sensitive ID types: passport, driver's license, state ID, visa, etc.

**Masking Pattern:**
```typescript
const maskIdNumber = (fullId: string): string => {
  if (!fullId || fullId.length < 4) return '••••';
  const lastFour = fullId.slice(-4);
  const masked = '•'.repeat(Math.max(0, fullId.length - 4));
  return masked + lastFour;
};
// Example: "123456789" → "•••••6789"
```

---

## Question 5: Demographics Consent Defaults

**Question:** Should `allowReporting` and `allowResearch` default to true or false?

**Answer:** ✅ **Default to TRUE (opt-out approach)**

**Implementation Notes:**
- Consent toggles pre-checked by default
- Users must explicitly opt-out if they don't want data used
- Clear explanation text next to each toggle:
  - `allowReporting`: "Allow this information to be included in anonymized compliance reports (EEO-1, VEVRAA, IPEDS, Title IX)"
  - `allowResearch`: "Allow this information to be used for anonymized institutional research"
- Legal compliance: Ensure toggles are visible and easy to change
- Display last updated timestamp to show when consent was given/modified

**Rationale:**
- Higher participation rates for compliance reporting
- Opt-out still provides user control
- Data is anonymized for reporting purposes

---

## Question 6: Financial Aid Fields

**Question:** Are `pellEligible` and `lowIncomeStatus` exposed via the demographics API, or separate?

**Answer:** ✅ **Defer to future change ISS-012**

**Implementation Notes for ISS-010:**
- **OUT OF SCOPE** for current implementation
- Section 2.15 (Personal & Family Status) will NOT include:
  - `pellEligible` field
  - `lowIncomeStatus` field
- These fields require integration with Financial Aid system
- Create **ISS-012** for future implementation

**ISS-010 Will Include:**
- User-editable fields only:
  - `maritalStatus`
  - `numberOfDependents`
  - `householdIncomeRange`

**Future ISS-012 Scope:**
- Design Financial Aid API integration
- Add readonly calculated fields (`pellEligible`, `lowIncomeStatus`)
- Determine if separate endpoint needed or demographics extension

---

## Question 7: Demographics Separate Tab

**Question:** Should demographics be a separate tab, or inline sections below extended fields?

**Answer:** ✅ **Separate tabs with Extended Profile first, then Demographics as second tab**

**Implementation Notes:**
- **Tab Structure:**
  - **Tab 1:** "Extended Profile"
    - Staff: Sections 1.1-1.7 (Professional Info, Employment, Credentials, Office Hours, Research, Links, Memberships)
    - Learner: Sections 2.1-2.7 (Student Info, Emergency Contacts, Parents, IDs, Prior Ed, Accommodations, Housing)
  - **Tab 2:** "Demographics"
    - Staff: Sections 1.8-1.14 (Identity, Race, Veteran, Work Auth, Disability, Language, Consent)
    - Learner: Sections 2.8-2.17 (Identity, Race, Citizenship, First Gen, Veteran, Disability, Language, Financial, Religious, Consent)

- **Within Each Tab:**
  - All sections are collapsible/expandable
  - Demographics sections show "Voluntary" badges
  - Smooth scroll between sections

- **Navigation:**
  - Tab switching preserves unsaved changes (auto-save handles persistence)
  - Active tab highlighted
  - URL routing: `/profile?tab=extended` and `/profile?tab=demographics` (optional)

**UI Pattern:**
```
┌─────────────────────────────────────┐
│  Extended Profile  |  Demographics  │ ← Tabs
├─────────────────────────────────────┤
│ [EXTENDED CONTENT - Collapsible]    │
│ ▼ Professional Information          │
│ ▼ Employment Details                │
│ ▶ Credentials & Certifications      │
│ ▶ Office Hours                      │
│ ...                                  │
└─────────────────────────────────────┘
```

---

## Implementation Priorities

Based on these answers, the team should prioritize:

1. **Phase 1 (Foundation):**
   - Auto-save on blur mechanism (debounced)
   - Tab navigation component (2 tabs: Extended + Demographics)
   - ID number masking utility
   - Consent toggle defaults (true)
   - "Show this section" toggle for Parent/Guardian

2. **Phase 2 (Parallel Development):**
   - Staff: Implement 14 sections with auto-save
   - Learner: Implement 17 sections with auto-save
   - Accommodations: VIEW + REQUEST only for learners
   - Parent/Guardian: Hidden by default (age 18+) with show toggle

3. **Phase 3 (Integration):**
   - Tab switching with state preservation
   - Demographics sections in separate tab
   - Final testing of auto-save behavior
   - ID masking display verification

---

## Out of Scope (Deferred)

- **ISS-012:** Financial aid fields (`pellEligible`, `lowIncomeStatus`)
  - Will be implemented separately after ISS-010
  - Requires Financial Aid system integration

---

## Approval

- [x] All 7 questions answered
- [x] Answers documented and ready for team implementation
- [ ] Human final approval for implementation start

**Next Step:** Load `team-config-ISS-010-PROFILE-FORMS.json` and begin Phase 1 implementation.
