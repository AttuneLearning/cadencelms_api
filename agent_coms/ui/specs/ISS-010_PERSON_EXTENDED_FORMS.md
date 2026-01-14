# ISS-010: PersonExtended & Demographics Profile Forms - Detailed Specification

> **Version:** 1.1.0  
> **Created:** 2026-01-13  
> **Updated:** 2026-01-13  
> **Status:** Pending Review  
> **Parent Issue:** ISS-010 in ISSUE_QUEUE.md

---

## Overview

Add role-specific extended profile fields and demographics to the My Profile pages:
- **Staff Profile** (`/staff/profile`): `IStaffPersonExtended` + employee-relevant `IDemographics`
- **Learner Profile** (`/learner/profile`): `ILearnerPersonExtended` + student-relevant `IDemographics`

### Demographics Context

| Context | Purpose | Compliance |
|---------|---------|------------|
| **Staff (Employee)** | EEO reporting, work authorization, veteran status | EEO-1, VEVRAA, ADA, Section 503 |
| **Learner (Student)** | IPEDS reporting, Title IX, financial aid eligibility | IPEDS, Title IX, Section 504, FERPA |

All demographics fields are **voluntary** and require explicit consent before data can be used for reporting.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/users/me/person/extended` | Fetch extended person data (context-aware) |
| PUT | `/api/v2/users/me/person/extended` | Update extended person data |
| GET | `/api/v2/users/me/demographics` | Fetch demographics data |
| PUT | `/api/v2/users/me/demographics` | Update demographics data |

**Headers:**
- `Authorization: Bearer <token>`
- `X-User-Type-Context: staff | learner` (determines which extended profile to return)

---

## Part 1: Staff Profile Extended (`IStaffPersonExtended`)

### Section 1.1: Professional Information

**Collapsible section - Default: Expanded**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `professionalTitle` | string | No | Max 100 chars | Text Input |
| `headline` | string | No | Max 200 chars | Textarea (2 lines) |
| `academicRank` | enum | No | Valid option | Select Dropdown |
| `contractType` | enum | No | Valid option | Select Dropdown |

**academicRank options:**
- `instructor` → "Instructor"
- `assistant-professor` → "Assistant Professor"
- `associate-professor` → "Associate Professor"
- `professor` → "Professor"
- `distinguished-professor` → "Distinguished Professor"

**contractType options:**
- `full-time` → "Full-Time"
- `part-time` → "Part-Time"
- `adjunct` → "Adjunct"
- `visiting` → "Visiting"
- `emeritus` → "Emeritus"

---

### Section 1.2: Employment Details

**Collapsible section - Default: Collapsed**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `employeeId` | string | Readonly | N/A | Text (display only) |
| `hireDate` | date | Readonly | N/A | Text (display only) |
| `officeLocation` | string | No | Max 100 chars | Text Input |

---

### Section 1.3: Credentials & Certifications

**Collapsible section - Default: Collapsed**  
**Array field - supports add/edit/remove**

Each `ICredential` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `type` | enum | Yes | Valid option | Select Dropdown |
| `name` | string | Yes | Min 2, Max 150 chars | Text Input |
| `issuingOrganization` | string | Yes | Min 2, Max 150 chars | Text Input |
| `fieldOfStudy` | string | No | Max 100 chars | Text Input |
| `dateEarned` | date | No | Not future date | Date Picker |
| `expirationDate` | date | No | After dateEarned | Date Picker |
| `credentialId` | string | No | Max 50 chars | Text Input |

**type options:**
- `degree` → "Degree"
- `certification` → "Certification"
- `license` → "License"
- `other` → "Other"

**UI Pattern:** Card list with "Add Credential" button. Each card shows summary with edit/delete icons.

---

### Section 1.4: Office Hours

**Collapsible section - Default: Collapsed**  
**Array field - supports add/edit/remove**

Each `IOfficeHours` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `dayOfWeek` | enum | Yes | Valid day | Select Dropdown |
| `startTime` | time | Yes | HH:MM format | Time Picker |
| `endTime` | time | Yes | HH:MM, after startTime | Time Picker |
| `location` | string | No | Max 100 chars | Text Input |
| `appointmentRequired` | boolean | No | N/A | Checkbox |
| `notes` | string | No | Max 500 chars | Textarea |

**dayOfWeek options:** monday, tuesday, wednesday, thursday, friday, saturday, sunday

**UI Pattern:** Table/grid layout showing weekly schedule. "Add Office Hours" button opens modal.

---

### Section 1.5: Research & Publications

**Collapsible section - Default: Collapsed**

#### Research Interests
**Array of strings - tag-style input**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `researchInterests` | string[] | No | Each max 50 chars | Tag Input |

#### Publications
**Array field - supports add/edit/remove**

Each `IPublication` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `title` | string | Yes | Min 5, Max 300 chars | Text Input |
| `type` | enum | Yes | Valid option | Select Dropdown |
| `authors` | string | Yes | Min 2, Max 500 chars | Textarea |
| `venue` | string | Yes | Min 2, Max 200 chars | Text Input |
| `publicationDate` | date | No | Not future | Date Picker |
| `doi` | string | No | DOI format regex | Text Input |
| `url` | string | No | Valid URL | URL Input |
| `abstract` | string | No | Max 2000 chars | Textarea |

**type options:**
- `journal-article` → "Journal Article"
- `conference-paper` → "Conference Paper"
- `book` → "Book"
- `book-chapter` → "Book Chapter"
- `other` → "Other"

---

### Section 1.6: Professional Links

**Collapsible section - Default: Collapsed**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `linkedInUrl` | string | No | Valid URL, contains linkedin.com | URL Input |
| `orcidId` | string | No | ORCID format (0000-0000-0000-0000) | Text Input with mask |
| `googleScholarUrl` | string | No | Valid URL, contains scholar.google | URL Input |
| `websiteUrl` | string | No | Valid URL | URL Input |

---

### Section 1.7: Professional Memberships

**Collapsible section - Default: Collapsed**  
**Array field - supports add/edit/remove**

Each `IProfessionalMembership` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `organizationName` | string | Yes | Min 2, Max 150 chars | Text Input |
| `membershipType` | string | No | Max 50 chars | Text Input |
| `memberId` | string | No | Max 50 chars | Text Input |
| `startDate` | date | No | Not future | Date Picker |
| `endDate` | date | No | After startDate | Date Picker |
| `isActive` | boolean | Yes | Default true | Toggle |

---

## Part 1B: Staff Demographics (`IDemographics` - Employee Context)

> **⚠️ All demographics fields are VOLUNTARY**  
> Displayed with clear "This information is optional" messaging.  
> Used for EEO-1 reporting, VEVRAA compliance, and workplace accommodations.

---

### Section 1.8: Identity & Gender (EEO)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - EEO Reporting"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `legalGender` | enum | No | Valid option | Select Dropdown |
| `genderIdentity` | string | No | Max 50 chars | Text Input |
| `pronouns` | string | No | Max 30 chars | Text Input |

**legalGender options:**
- `male` → "Male"
- `female` → "Female"
- `non-binary` → "Non-Binary"
- `other` → "Other"
- `prefer-not-to-say` → "Prefer Not to Say"

---

### Section 1.9: Race & Ethnicity (EEO-1)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - EEO-1 Reporting"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `isHispanicLatino` | boolean | No | N/A | Yes/No Radio |
| `race` | enum[] | No | Valid options (multi-select) | Checkbox Group |

**race options (select all that apply):**
- `american-indian-alaska-native` → "American Indian or Alaska Native"
- `asian` → "Asian"
- `black-african-american` → "Black or African American"
- `native-hawaiian-pacific-islander` → "Native Hawaiian or Other Pacific Islander"
- `white` → "White"
- `two-or-more-races` → "Two or More Races"
- `other` → "Other"
- `prefer-not-to-say` → "Prefer Not to Say"

---

### Section 1.10: Veteran Status (VEVRAA)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - VEVRAA Compliance"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `veteranStatus` | enum | No | Valid option | Select Dropdown |
| `militaryBranch` | string | No | Max 50 chars, show if veteran | Text Input |
| `yearsOfService` | number | No | 0-50, show if veteran | Number Input |

**veteranStatus options:**
- `not-veteran` → "Not a Veteran"
- `active-duty` → "Active Duty"
- `veteran` → "Veteran"
- `reserve` → "Reserve/National Guard"
- `dependent` → "Veteran Dependent"
- `prefer-not-to-say` → "Prefer Not to Say"

**Conditional display:** `militaryBranch` and `yearsOfService` visible when `veteranStatus` is `active-duty`, `veteran`, or `reserve`.

---

### Section 1.11: Work Authorization

**Collapsible section - Default: Collapsed**  
**Header badge: "Employment Eligibility"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `citizenship` | enum | No | Valid option | Select Dropdown |
| `countryOfCitizenship` | string | No | ISO country code | Country Select |
| `visaType` | enum | No | Show if not US citizen | Select Dropdown |
| `visaExpirationDate` | date | Conditional | Required if visaType set | Date Picker |

**citizenship options:**
- `us-citizen` → "U.S. Citizen"
- `us-national` → "U.S. National"
- `permanent-resident` → "Permanent Resident (Green Card)"
- `visa-holder` → "Visa Holder"
- `other` → "Other"
- `prefer-not-to-say` → "Prefer Not to Say"

**visaType options (show if citizenship is `visa-holder`):**
- `h1b` → "H-1B (Specialty Occupation)"
- `h4` → "H-4 (Dependent)"
- `other` → "Other Work Visa"

---

### Section 1.12: Disability (ADA/Section 503)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - ADA Compliance"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `hasDisability` | boolean | No | N/A | Yes/No/Prefer Not to Say Radio |
| `disabilityType` | enum[] | No | Show if hasDisability | Checkbox Group |
| `accommodationsRequired` | boolean | No | N/A | Checkbox |

**disabilityType options (select all that apply):**
- `physical` → "Physical/Mobility"
- `visual` → "Visual"
- `hearing` → "Hearing"
- `learning` → "Learning Disability"
- `mental-health` → "Mental Health"
- `chronic-illness` → "Chronic Illness"
- `other` → "Other"

---

### Section 1.13: Language

**Collapsible section - Default: Collapsed**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `primaryLanguage` | string | No | ISO 639-1 language code | Language Select |
| `englishProficiency` | enum | No | Valid option | Select Dropdown |
| `otherLanguages` | string[] | No | ISO language codes | Multi-select / Tags |

**englishProficiency options:**
- `native` → "Native Speaker"
- `fluent` → "Fluent"
- `advanced` → "Advanced"
- `intermediate` → "Intermediate"
- `basic` → "Basic"
- `limited` → "Limited"

---

### Section 1.14: Reporting Consent

**Collapsible section - Default: Expanded**  
**⚠️ Always visible at bottom of demographics**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `allowReporting` | boolean | Yes | Default shown | Toggle with explanation |
| `allowResearch` | boolean | Yes | Default shown | Toggle with explanation |
| `lastUpdated` | date | Readonly | N/A | Text (display only) |

**UI Pattern:** 
- Clear explanation text for each toggle
- `allowReporting`: "Allow this information to be included in anonymized compliance reports (EEO-1, VEVRAA)"
- `allowResearch`: "Allow this information to be used for anonymized institutional research"

---

## Part 2: Learner Profile Extended (`ILearnerPersonExtended`)

### Section 2.1: Student Information

**Collapsible section - Default: Expanded**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `studentId` | string | Readonly | N/A | Text (display only) |
| `enrollmentStatus` | enum | Readonly | N/A | Badge (display only) |
| `expectedGraduationDate` | date | No | Future date | Date Picker |
| `actualGraduationDate` | date | Readonly | N/A | Text (display only) |
| `transferCredits` | number | Readonly | N/A | Text (display only) |

**enrollmentStatus display colors:**
- `enrolled` → Green badge
- `admitted` → Blue badge
- `prospective` → Gray badge
- `leave-of-absence` → Yellow badge
- `withdrawn` / `expelled` → Red badge
- `graduated` → Purple badge

---

### Section 2.2: Emergency Contacts ⚠️

**Collapsible section - Default: Expanded**  
**Array field - supports add/edit/remove**  
**⚠️ REQUIRED: Minimum 1 emergency contact**

Each `IEmergencyContact` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `fullName` | string | Yes | Min 2, Max 100 chars | Text Input |
| `relationship` | string | Yes | Min 2, Max 50 chars | Text Input |
| `primaryPhone` | phone | Yes | US phone format | Phone Input |
| `secondaryPhone` | phone | No | US phone format | Phone Input |
| `email` | email | No | Valid email | Email Input |
| `priority` | number | Yes | Auto-assigned (1, 2, 3...) | Drag handle / readonly |
| `medicalAuthorization` | boolean | No | Default false | Checkbox |
| `pickupAuthorization` | boolean | No | Default false | Checkbox |
| `notes` | string | No | Max 500 chars | Textarea |

**Address sub-fields (optional):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `street1` | string | If address | Max 100 chars |
| `street2` | string | No | Max 100 chars |
| `city` | string | If address | Max 50 chars |
| `state` | string | If address | 2-char state code |
| `postalCode` | string | If address | 5 or 9 digit ZIP |
| `country` | string | If address | Default "US" |

**UI Pattern:** Numbered cards with drag-to-reorder for priority. First contact marked as "Primary".

---

### Section 2.3: Parent/Guardian Information

**Collapsible section - Default: Collapsed**  
**Array field - supports add/edit/remove**  
**Note: May be hidden for adult learners (age 18+)**

Each `IParentGuardian` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `fullName` | string | Yes | Min 2, Max 100 chars | Text Input |
| `relationship` | enum | Yes | Valid option | Select Dropdown |
| `isCustodial` | boolean | Yes | Default true | Toggle |
| `phones` | array | Yes (min 1) | Valid phone entries | Phone list |
| `emails` | array | No | Valid email entries | Email list |
| `employer` | string | No | Max 100 chars | Text Input |
| `jobTitle` | string | No | Max 50 chars | Text Input |
| `educationLevel` | enum | No | Valid option | Select Dropdown |
| `ferpaAccess` | boolean | No | Default false | Checkbox |
| `notes` | string | No | Max 500 chars | Textarea |

**relationship options:**
- `mother` → "Mother"
- `father` → "Father"
- `legal-guardian` → "Legal Guardian"
- `other` → "Other"

---

### Section 2.4: Identification Documents

**Collapsible section - Default: Collapsed**  
**Array field - supports add/edit/remove**  
**🔒 Sensitive data - encrypted at rest**

Each `IIdentification` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `idType` | enum | Yes | Valid option | Select Dropdown |
| `idNumber` | string | Yes | Masked input, validated per type | Masked Text Input |
| `issuingAuthority` | string | No | Max 100 chars | Text Input |
| `issueDate` | date | No | Not future | Date Picker |
| `expirationDate` | date | No | After issueDate | Date Picker |

**idType options:**
- `passport` → "Passport"
- `drivers-license` → "Driver's License"
- `state-id` → "State ID"
- `student-id` → "Student ID"
- `visa` → "Visa"
- `birth-certificate` → "Birth Certificate"
- `other` → "Other"

**Display:** Show only last 4 digits after save (e.g., "••••••1234")

---

### Section 2.5: Prior Education

**Collapsible section - Default: Collapsed**  
**Array field - supports add/edit/remove**

Each `IPriorEducation` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `institutionName` | string | Yes | Min 2, Max 150 chars | Text Input |
| `institutionType` | enum | Yes | Valid option | Select Dropdown |
| `degreeEarned` | string | No | Max 100 chars | Text Input |
| `major` | string | No | Max 100 chars | Text Input |
| `minor` | string | No | Max 100 chars | Text Input |
| `startDate` | date | No | Not future | Date Picker |
| `endDate` | date | No | After startDate | Date Picker |
| `gpa` | number | No | 0.0 - gpaScale | Number Input |
| `gpaScale` | number | No | 4.0, 5.0, or 100 | Select (4.0/5.0/100) |
| `graduated` | boolean | Yes | Default false | Toggle |
| `transcriptOnFile` | boolean | Readonly | N/A | Badge |

**institutionType options:**
- `high-school` → "High School"
- `community-college` → "Community College"
- `university` → "University"
- `vocational` → "Vocational/Technical"
- `other` → "Other"

---

### Section 2.6: Accommodations

**Collapsible section - Default: Collapsed**  
**Array field - supports add/edit/remove**  
**🔒 Sensitive data - ADA protected**

Each `IAccommodation` entry:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `type` | string | Yes | Min 2, Max 100 chars | Text Input |
| `description` | string | No | Max 500 chars | Textarea |
| `startDate` | date | No | Any date | Date Picker |
| `endDate` | date | No | After startDate | Date Picker |
| `isActive` | boolean | Yes | Default true | Toggle |
| `documentationOnFile` | boolean | Readonly | N/A | Badge |
| `instructorNotes` | string | Readonly | N/A | Text (display only) |

---

### Section 2.7: Housing & Parking

**Collapsible section - Default: Collapsed**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `housingStatus` | enum | No | Valid option | Select Dropdown |
| `residenceHall` | string | No | Max 100 chars, show if on-campus | Text Input |
| `roomNumber` | string | No | Max 20 chars, show if on-campus | Text Input |
| `vehicleOnCampus` | boolean | No | Default false | Toggle |
| `vehicleInfo` | string | No | Max 200 chars, show if vehicleOnCampus | Text Input |
| `parkingPermit` | string | Readonly | N/A | Text (display only) |

**housingStatus options:**
- `on-campus` → "On Campus"
- `off-campus` → "Off Campus"
- `commuter` → "Commuter"
- `other` → "Other"

**Conditional display:**
- `residenceHall` and `roomNumber` only visible when `housingStatus === 'on-campus'`
- `vehicleInfo` only visible when `vehicleOnCampus === true`

---

## Part 2B: Learner Demographics (`IDemographics` - Student Context)

> **⚠️ All demographics fields are VOLUNTARY**  
> Displayed with clear "This information is optional" messaging.  
> Used for IPEDS reporting, Title IX compliance, Section 504, and financial aid eligibility.

---

### Section 2.8: Identity & Gender (Title IX)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - Title IX"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `legalGender` | enum | No | Valid option | Select Dropdown |
| `genderIdentity` | string | No | Max 50 chars | Text Input |
| `pronouns` | string | No | Max 30 chars | Text Input |

**legalGender options:**
- `male` → "Male"
- `female` → "Female"
- `non-binary` → "Non-Binary"
- `other` → "Other"
- `prefer-not-to-say` → "Prefer Not to Say"

---

### Section 2.9: Race & Ethnicity (IPEDS)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - IPEDS Reporting"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `isHispanicLatino` | boolean | No | N/A | Yes/No Radio |
| `race` | enum[] | No | Valid options (multi-select) | Checkbox Group |
| `tribalAffiliation` | string | No | Max 100 chars | Text Input |

**race options (select all that apply):**
- `american-indian-alaska-native` → "American Indian or Alaska Native"
- `asian` → "Asian"
- `black-african-american` → "Black or African American"
- `native-hawaiian-pacific-islander` → "Native Hawaiian or Other Pacific Islander"
- `white` → "White"
- `two-or-more-races` → "Two or More Races"
- `other` → "Other"
- `prefer-not-to-say` → "Prefer Not to Say"

**UI Pattern:** 
- Show `tribalAffiliation` text input when `american-indian-alaska-native` is selected

---

### Section 2.10: Citizenship & Visa (International Students)

**Collapsible section - Default: Collapsed**  
**Header badge: "International Student Information"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `citizenship` | enum | No | Valid option | Select Dropdown |
| `countryOfCitizenship` | string | No | ISO country code | Country Select |
| `countryOfBirth` | string | No | ISO country code | Country Select |
| `visaType` | enum | No | Show if not US citizen | Select Dropdown |
| `visaExpirationDate` | date | Conditional | Required if visaType set | Date Picker |
| `alienRegistrationNumber` | string | No | Max 20 chars, masked | Masked Text Input |

**citizenship options:**
- `us-citizen` → "U.S. Citizen"
- `us-national` → "U.S. National"
- `permanent-resident` → "Permanent Resident (Green Card)"
- `refugee-asylee` → "Refugee/Asylee"
- `temporary-resident` → "Temporary Resident"
- `visa-holder` → "Visa Holder"
- `other` → "Other"
- `prefer-not-to-say` → "Prefer Not to Say"

**visaType options (show if citizenship is `visa-holder`):**
- `f1` → "F-1 (Student)"
- `j1` → "J-1 (Exchange Visitor)"
- `m1` → "M-1 (Vocational Student)"
- `h4` → "H-4 (Dependent)"
- `other` → "Other"

---

### Section 2.11: First Generation Student

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - IPEDS Reporting"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `firstGenerationStudent` | boolean | No | N/A | Yes/No/Unknown Radio |
| `parent1EducationLevel` | enum | No | Show if firstGen question answered | Select Dropdown |
| `parent2EducationLevel` | enum | No | Show if firstGen question answered | Select Dropdown |

**educationLevel options:**
- `less-than-high-school` → "Less than High School"
- `high-school` → "High School Diploma/GED"
- `some-college` → "Some College (No Degree)"
- `associates` → "Associate's Degree"
- `bachelors` → "Bachelor's Degree"
- `masters` → "Master's Degree"
- `doctorate` → "Doctoral Degree"

**First-Generation Definition (display as helper text):**
> "A first-generation college student is someone whose parent(s)/legal guardian(s) have not completed a bachelor's degree."

---

### Section 2.12: Veteran Status (GI Bill)

**Collapsible section - Default: Collapsed**  
**Header badge: "Veteran Benefits Eligibility"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `veteranStatus` | enum | No | Valid option | Select Dropdown |
| `militaryBranch` | string | No | Max 50 chars, show if veteran | Text Input |
| `yearsOfService` | number | No | 0-50, show if veteran | Number Input |

**veteranStatus options:**
- `not-veteran` → "Not a Veteran"
- `active-duty` → "Active Duty"
- `veteran` → "Veteran"
- `reserve` → "Reserve/National Guard"
- `dependent` → "Veteran Dependent (eligible for benefits)"
- `prefer-not-to-say` → "Prefer Not to Say"

---

### Section 2.13: Disability (Section 504)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - Disability Services"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `hasDisability` | boolean | No | N/A | Yes/No/Prefer Not to Say Radio |
| `disabilityType` | enum[] | No | Show if hasDisability | Checkbox Group |
| `accommodationsRequired` | boolean | No | N/A | Checkbox |

**disabilityType options (select all that apply):**
- `physical` → "Physical/Mobility"
- `visual` → "Visual Impairment"
- `hearing` → "Hearing Impairment"
- `learning` → "Learning Disability"
- `mental-health` → "Mental Health Condition"
- `chronic-illness` → "Chronic Health Condition"
- `other` → "Other"

**Helper text:**
> "Disclosing a disability allows us to connect you with appropriate support services. Contact Disability Services for accommodations."

---

### Section 2.14: Language (ESL Services)

**Collapsible section - Default: Collapsed**  
**Header badge: "Language Information"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `primaryLanguage` | string | No | ISO 639-1 language code | Language Select |
| `englishProficiency` | enum | No | Valid option | Select Dropdown |
| `otherLanguages` | string[] | No | ISO language codes | Multi-select / Tags |

**englishProficiency options:**
- `native` → "Native Speaker"
- `fluent` → "Fluent"
- `advanced` → "Advanced"
- `intermediate` → "Intermediate"
- `basic` → "Basic"
- `limited` → "Limited"

---

### Section 2.15: Personal & Family Status (Financial Aid)

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary - Financial Aid Eligibility"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `maritalStatus` | enum | No | Valid option | Select Dropdown |
| `numberOfDependents` | number | No | 0-20 | Number Input |
| `pellEligible` | boolean | Readonly | N/A | Badge (display only) |
| `lowIncomeStatus` | boolean | Readonly | N/A | Badge (display only) |
| `householdIncomeRange` | enum | No | Valid option | Select Dropdown |

**maritalStatus options:**
- `single` → "Single"
- `married` → "Married"
- `domestic-partnership` → "Domestic Partnership"
- `divorced` → "Divorced"
- `widowed` → "Widowed"
- `separated` → "Separated"
- `prefer-not-to-say` → "Prefer Not to Say"

**householdIncomeRange options:**
- `under-25k` → "Under $25,000"
- `25k-50k` → "$25,000 - $50,000"
- `50k-75k` → "$50,000 - $75,000"
- `75k-100k` → "$75,000 - $100,000"
- `100k-150k` → "$100,000 - $150,000"
- `over-150k` → "Over $150,000"
- `prefer-not-to-say` → "Prefer Not to Say"

**Note:** `pellEligible` and `lowIncomeStatus` are calculated/assigned by Financial Aid office, not user-editable.

---

### Section 2.16: Religious Accommodations

**Collapsible section - Default: Collapsed**  
**Header badge: "Voluntary"**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `religiousAffiliation` | string | No | Max 100 chars | Text Input |
| `religiousAccommodations` | boolean | No | Default false | Checkbox |

**Helper text for religiousAccommodations:**
> "Check if you may need accommodations for religious observances (e.g., exam rescheduling for religious holidays)."

---

### Section 2.17: Reporting Consent

**Collapsible section - Default: Expanded**  
**⚠️ Always visible at bottom of demographics**

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| `allowReporting` | boolean | Yes | Default shown | Toggle with explanation |
| `allowResearch` | boolean | Yes | Default shown | Toggle with explanation |
| `lastUpdated` | date | Readonly | N/A | Text (display only) |

**UI Pattern:** 
- Clear explanation text for each toggle
- `allowReporting`: "Allow this information to be included in anonymized compliance reports (IPEDS, Title IX)"
- `allowResearch`: "Allow this information to be used for anonymized institutional research"

---

## Validation Summary

### Required Validations

| Context | Validation Rule |
|---------|-----------------|
| **Phone** | US format: `+1 (XXX) XXX-XXXX` |
| **Email** | RFC 5322 compliant |
| **URL** | Valid https:// URL |
| **Date** | ISO 8601 format, context-aware (future/past) |
| **LinkedIn** | URL must contain `linkedin.com` |
| **ORCID** | Format: `0000-0000-0000-0000` |
| **ZIP** | 5 digits or 5+4 format |
| **State** | 2-letter US state code |

### Error Messages

Use clear, actionable messages:
- ❌ "Invalid input"
- ✅ "Please enter a valid phone number in format +1 (555) 123-4567"

---

## Component Architecture

```
src/pages/profile/
├── ProfilePage.tsx                    # Existing - add tabs or sections
├── components/
│   ├── StaffProfileExtended.tsx       # Staff extended form container
│   ├── LearnerProfileExtended.tsx     # Learner extended form container
│   ├── StaffDemographics.tsx          # Staff demographics form container
│   ├── LearnerDemographics.tsx        # Learner demographics form container
│   └── sections/
│       ├── shared/
│       │   ├── CollapsibleSection.tsx     # Reusable collapsible wrapper
│       │   ├── VoluntaryBadge.tsx         # "Voluntary" indicator badge
│       │   └── ConsentToggle.tsx          # Consent toggle with explanation
│       ├── demographics/
│       │   ├── IdentityGenderSection.tsx  # Shared by staff/learner
│       │   ├── RaceEthnicitySection.tsx   # Shared (IPEDS for learner, EEO for staff)
│       │   ├── VeteranStatusSection.tsx   # Shared
│       │   ├── DisabilitySection.tsx      # Shared
│       │   ├── LanguageSection.tsx        # Shared
│       │   ├── CitizenshipSection.tsx     # Slightly different options per context
│       │   ├── FirstGenerationSection.tsx # Learner only
│       │   ├── FinancialStatusSection.tsx # Learner only
│       │   ├── ReligiousSection.tsx       # Learner only
│       │   └── ReportingConsentSection.tsx # Shared
│       ├── staff/
│       │   ├── ProfessionalInfoSection.tsx
│       │   ├── EmploymentSection.tsx
│       │   ├── CredentialsSection.tsx
│       │   ├── OfficeHoursSection.tsx
│       │   ├── ResearchSection.tsx
│       │   ├── ProfessionalLinksSection.tsx
│       │   └── MembershipsSection.tsx
│       └── learner/
│           ├── StudentInfoSection.tsx
│           ├── EmergencyContactsSection.tsx
│           ├── ParentGuardiansSection.tsx
│           ├── IdentificationsSection.tsx
│           ├── PriorEducationSection.tsx
│           ├── AccommodationsSection.tsx
│           └── HousingParkingSection.tsx
```

---

## Implementation Phases

### Phase 1: API & Types (3 hours)
- [ ] Add extended types to `src/entities/user-profile/model/types.ts`
- [ ] Add demographics types to `src/entities/user-profile/model/types.ts`
- [ ] Add API functions for GET/PUT extended data
- [ ] Add API functions for GET/PUT demographics data
- [ ] Add React Query hooks for extended and demographics data

### Phase 2: Shared Components (2 hours)
- [ ] Create `CollapsibleSection` component with badge support
- [ ] Create `VoluntaryBadge` component for demographics indicators
- [ ] Create `ConsentToggle` component with explanation text
- [ ] Create reusable array field manager (add/edit/remove)

### Phase 3: Staff Profile Sections (4 hours)
- [ ] Implement 7 staff extended sections (1.1 - 1.7)
- [ ] Add array field management (credentials, publications, etc.)
- [ ] Add validation for all fields

### Phase 4: Staff Demographics Sections (2 hours)
- [ ] Implement 7 staff demographics sections (1.8 - 1.14)
- [ ] EEO, VEVRAA, ADA voluntary fields
- [ ] Work authorization with conditional visa fields
- [ ] Consent toggles at bottom

### Phase 5: Learner Profile Sections (5 hours)
- [ ] Implement 7 learner extended sections (2.1 - 2.7)
- [ ] Emergency contacts with priority ordering
- [ ] Sensitive field masking (ID numbers)
- [ ] Conditional field visibility (housing, vehicle)

### Phase 6: Learner Demographics Sections (3 hours)
- [ ] Implement 10 learner demographics sections (2.8 - 2.17)
- [ ] IPEDS, Title IX, Section 504 voluntary fields
- [ ] First generation with parent education levels
- [ ] Financial aid eligibility fields (readonly calculated fields)
- [ ] Religious accommodations
- [ ] Consent toggles at bottom

### Phase 7: Integration & Polish (2 hours)
- [ ] Integrate all sections into ProfilePage with tabs/accordion
- [ ] Add loading/error states
- [ ] Mobile responsive testing
- [ ] Accessibility review (ARIA labels, keyboard nav)

**Estimated Total: 21 hours**

---

## Section Summary

| Profile | Extended Sections | Demographics Sections | Total Sections |
|---------|-------------------|----------------------|----------------|
| **Staff** | 7 (1.1 - 1.7) | 7 (1.8 - 1.14) | 14 |
| **Learner** | 7 (2.1 - 2.7) | 10 (2.8 - 2.17) | 17 |
| **Shared** | - | 5 (Identity, Race, Veteran, Disability, Language) | - |

---

## Open Questions

1. **Auto-save vs Manual Save:** Should each section auto-save on blur, or have a "Save" button per section?
2. **Parent/Guardian Visibility:** Should parent/guardian section be hidden for learners over 18?
3. **Accommodations Edit Access:** Can learners edit their own accommodations, or is this admin-only?
4. **ID Number Storage:** Is the API ready to accept/return encrypted ID numbers?
5. **Demographics Consent Defaults:** Should `allowReporting` and `allowResearch` default to true or false?
6. **Financial Aid Fields:** Are `pellEligible` and `lowIncomeStatus` exposed via the demographics API, or separate?
7. **Demographics Separate Tab:** Should demographics be a separate tab, or inline sections below extended fields?

---

## Approval Checklist

Before implementation:

- [ ] Human reviewed field groupings
- [ ] Human approved required vs optional fields
- [ ] Human approved demographics distribution (staff vs learner)
- [ ] API endpoints confirmed available (`/users/me/demographics`)
- [ ] Design mockups reviewed (if any)
- [ ] Open questions answered
