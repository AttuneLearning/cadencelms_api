# Specifications

System specifications that inform architecture decisions and implementation.

## Commerce

Billing, payments, and commerce platform specs.

| Spec | Description | Status |
|------|-------------|--------|
| [[commerce/BILLING_REGISTRATION_SYSTEM_SPEC]] | Commerce Platform (payments, cart, checkout) | Ready |
| [[commerce/BILLING_USER_STORIES]] | User stories for billing system | Reference |
| [[commerce/COMMERCE_ARCHITECTURE]] | Commerce system architecture overview | Reference |
| [[commerce/COMMERCE_SYSTEM_BOUNDARIES]] | System boundaries between Commerce/LMS/Payout | Reference |
| [[commerce/COMMERCE_LMS_INTEGRATION_SPEC]] | Integration between Commerce and LMS | Reference |
| [[commerce/COMMERCE_INSTRUCTOR_CONTENT_PAYMENT_SYSTEM]] | Instructor/creator payout system | Reference |

**Related ADRs:** [[../architecture/decisions/ADR-001-REFUND-POLICY|ADR-001]] through [[../architecture/decisions/ADR-007-EMAIL-PROVIDER|ADR-007]]

---

## Learning

Knowledge systems, assessments, and learning content specs.

| Spec | Description | Status |
|------|-------------|--------|
| [[learning/FLASHCARD_FLOW_SPEC]] | Flashcard system with spaced repetition and retention checks | **Approved** |
| [[learning/LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC]] | Knowledge node system for adaptive learning | Reference |
| [[learning/LEARNER_ACTIVITY_KNOWLEDGE_NODE_IMPLEMENTATION_PLAN]] | Implementation plan for knowledge nodes | Reference |
| [[learning/Question_Bank_System_Implementation]] | Question bank and assessment system | Reference |

**Related ADRs:** Gap - ADR-CONTENT-002 (Adaptive Learning) needed

---

## Reporting

Report system and analytics specs.

| Spec | Description | Status |
|------|-------------|--------|
| [[reporting/REPORT_SYSTEM_SPEC]] | Core report system specification | Reference |
| [[reporting/REPORT_SYSTEM_UI_IMPLEMENTATION_PLAN]] | UI implementation plan | Reference |
| [[reporting/REPORT_SYSTEM_UIPROPOSED_APIs]] | Proposed API endpoints | Reference |

**Related ADRs:** Gap - ADR-OPS-002 (Reporting Architecture) needed

---

## Authorization

Authorization model and role system specs.

| Spec | Description | Status |
|------|-------------|--------|
| [[authorization/UNIFIED_AUTHORIZATION_MODEL]] | Unified authorization model | Reference |

**Related ADRs:** [[../architecture/decisions/ADR-AUTH-001-UNIFIED-AUTHORIZATION-MODEL]]

---

## Features

Feature-specific specs and implementation plans.

| Spec | Description | Status |
|------|-------------|--------|
| [[features/BADGE_SYSTEM_SPEC]] | Badge/achievement system | Planned |
| [[features/CERTIFICATE_BUILDER_SPEC]] | Certificate template builder | Planned |
| [[features/TIME_PACING_PREMIUM_FEATURE]] | Time-based pacing for courses | Reference |
| [[features/TIME_PACING_UI_CHANGES]] | UI changes for time pacing | Reference |
| [[features/COURSE_DEPTH_OVERRIDE_IMPLEMENTATION_PLAN]] | Course depth override feature | Reference |
| [[features/PREREQ_CONTENT_UNLOCKING_DOCUMENTATION_INDEX]] | Prerequisite system docs index | Reference |
| [[features/PREREQ_DOCUMENTATION_COMPLETE_SUMMARY]] | Prerequisite system summary | Reference |

---

## Directory Structure

```
dev_communication/specs/
├── index.md                 # This file
├── commerce/                # Billing, payments, commerce
├── learning/                # Knowledge nodes, assessments
├── reporting/               # Report system
├── authorization/           # Auth model specs
└── features/                # Feature-specific specs
```

---

[[../architecture/index|← Back to Architecture Hub]]
