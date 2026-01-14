# Billing & Auto-Registration System Specification

**Date:** 2026-01-14  
**Status:** 📋 DRAFT - Architecture & Planning  
**Owner:** API Team  
**Priority:** High  
**Estimated Effort:** 8-12 weeks (phased)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [User Journey Maps](#user-journey-maps)
4. [Epic & User Stories](#epic--user-stories)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [Payment Processor Integration](#payment-processor-integration)
8. [Workflow State Machines](#workflow-state-machines)
9. [Certificate Generation](#certificate-generation)
10. [Phase Breakdown](#phase-breakdown)
11. [Security Considerations](#security-considerations)
12. [Open Questions](#open-questions)

---

## Executive Summary

This document outlines the architecture for an integrated **Billing → Registration → Approval → Enrollment → Completion → Certification** system. The system allows learners to:

- Browse available programs and courses
- Purchase individual courses (a-la-carte) or complete programs
- Complete payment through multiple payment processors
- Await approval (if required) or auto-enroll
- Track progress through purchased content
- Receive certificates upon successful completion

### Core Principles

1. **Payment Processor Agnostic** - Abstract payment layer supporting Stripe, Square, GPay, Elavon
2. **Approval Flexibility** - Support both auto-approval and manual approval workflows
3. **Audit Trail** - Complete financial and enrollment audit logging
4. **Refund Support** - Full and partial refund capabilities
5. **Certificate Automation** - Auto-generate certificates on completion criteria met

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        BILLING & REGISTRATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

  DISCOVERY          CART/CHECKOUT        PAYMENT           APPROVAL         ENROLLMENT
  ─────────          ─────────────        ───────           ────────         ──────────
      │                    │                 │                  │                 │
      ▼                    ▼                 ▼                  ▼                 ▼
┌──────────┐        ┌──────────┐       ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Browse  │        │   Add    │       │  Submit  │      │  Review  │      │  Enroll  │
│ Catalog  │───────▶│ to Cart  │──────▶│ Payment  │─────▶│ & Approve│─────▶│ Learner  │
│          │        │          │       │          │      │          │      │          │
└──────────┘        └──────────┘       └──────────┘      └──────────┘      └──────────┘
                          │                 │                  │                 │
                          ▼                 ▼                  ▼                 ▼
                    ┌──────────┐       ┌──────────┐      ┌──────────┐      ┌──────────┐
                    │ Pricing  │       │ Payment  │      │  Auto    │      │  Track   │
                    │ & Discounts      │ Processor│      │ Approve? │      │ Progress │
                    └──────────┘       └──────────┘      └──────────┘      └──────────┘
                                            │                                    │
                                            ▼                                    ▼
                                       ┌──────────┐                        ┌──────────┐
                                       │  Refund  │                        │ Generate │
                                       │  System  │                        │ Certificate
                                       └──────────┘                        └──────────┘
```

### Key Entities

| Entity | Description |
|--------|-------------|
| **Catalog** | Public-facing list of purchasable programs/courses |
| **Program** | Collection of courses sold as a bundle with pricing |
| **Cart** | Temporary storage for pending purchases |
| **Order** | Finalized purchase with payment details |
| **Registration** | Request to enroll (pending approval or auto-approved) |
| **Payment** | Payment transaction record |
| **Enrollment** | Active learner access to course content |
| **Certificate** | Completion credential |

---

## User Journey Maps

### Journey 1: A-La-Carte Course Purchase

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LEARNER: Individual Course Purchase                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. DISCOVER                                                                    │
│     └─▶ Browse course catalog → View course details → Check prerequisites      │
│                                                                                 │
│  2. SELECT                                                                      │
│     └─▶ Click "Add to Cart" → View cart → Apply coupon (optional)              │
│                                                                                 │
│  3. CHECKOUT                                                                    │
│     └─▶ Create account (if new) → Enter payment info → Submit payment          │
│                                                                                 │
│  4. CONFIRMATION                                                                │
│     └─▶ Payment processed → Registration created → Email confirmation          │
│                                                                                 │
│  5. APPROVAL (if required)                                                      │
│     └─▶ Admin reviews → Approves/Rejects → Learner notified                    │
│                                                                                 │
│  6. ENROLLMENT                                                                  │
│     └─▶ Auto-enrolled in course → Access granted → Welcome email               │
│                                                                                 │
│  7. LEARNING                                                                    │
│     └─▶ Complete modules → Pass assessments → Track progress                   │
│                                                                                 │
│  8. COMPLETION                                                                  │
│     └─▶ All requirements met → Certificate generated → Available for download  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Journey 2: Full Program Purchase

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LEARNER: Full Program/Bundle Purchase                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. DISCOVER                                                                    │
│     └─▶ Browse programs → View program details → See included courses          │
│                                                                                 │
│  2. SELECT                                                                      │
│     └─▶ Click "Enroll in Program" → Review bundle pricing vs individual        │
│                                                                                 │
│  3. CHECKOUT                                                                    │
│     └─▶ Bundle discount applied → Enter payment → Submit                       │
│                                                                                 │
│  4. CONFIRMATION                                                                │
│     └─▶ Single order for all courses → Multiple registrations created          │
│                                                                                 │
│  5. ENROLLMENT                                                                  │
│     └─▶ Enrolled in ALL program courses → Suggested course order shown         │
│                                                                                 │
│  6. PROGRESSION                                                                 │
│     └─▶ Complete courses in sequence → Individual course certificates          │
│                                                                                 │
│  7. PROGRAM COMPLETION                                                          │
│     └─▶ All courses complete → PROGRAM certificate generated                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Journey 3: Department/Subdepartment Subscription

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LEARNER: Department Subscription (Access to All Courses)                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. DISCOVER                                                                    │
│     └─▶ View department offerings → See subscription pricing tiers             │
│                                                                                 │
│  2. SUBSCRIBE                                                                   │
│     └─▶ Select tier (monthly/annual) → Recurring payment setup                 │
│                                                                                 │
│  3. ACCESS                                                                      │
│     └─▶ Access to ALL published courses in department/subdepartments           │
│                                                                                 │
│  4. ENROLLMENT ON-DEMAND                                                        │
│     └─▶ Self-enroll in any course → No additional payment → Track all progress │
│                                                                                 │
│  5. RENEWAL                                                                     │
│     └─▶ Auto-renewal → Grace period if failed → Downgrade/Cancel options       │
│                                                                                 │
│  6. CERTIFICATES                                                                │
│     └─▶ Earn certificates for completed courses (while subscription active)    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Epic & User Stories

### Epic 1: Catalog & Pricing Management

> **As a** department admin  
> **I want to** set pricing for courses and programs  
> **So that** learners can purchase access

| Story ID | Story | Priority | Points |
|----------|-------|----------|--------|
| **CAT-001** | As a dept-admin, I can set a price for a course (one-time purchase) | High | 3 |
| **CAT-002** | As a dept-admin, I can create a program bundle with bundled pricing | High | 5 |
| **CAT-003** | As a dept-admin, I can set subscription pricing for department access | Medium | 5 |
| **CAT-004** | As a dept-admin, I can create discount codes/coupons | Medium | 5 |
| **CAT-005** | As a dept-admin, I can set course/program availability dates | Low | 3 |
| **CAT-006** | As a learner, I can browse the public course catalog | High | 3 |
| **CAT-007** | As a learner, I can view course details and pricing | High | 2 |
| **CAT-008** | As a learner, I can view program details with included courses | High | 3 |
| **CAT-009** | As a billing-admin, I can view revenue reports by course/program | Medium | 5 |

---

### Epic 2: Shopping Cart & Checkout

> **As a** learner  
> **I want to** add courses to a cart and checkout  
> **So that** I can purchase multiple items in one transaction

| Story ID | Story | Priority | Points |
|----------|-------|----------|--------|
| **CART-001** | As a learner, I can add a course to my cart | High | 3 |
| **CART-002** | As a learner, I can add a program bundle to my cart | High | 3 |
| **CART-003** | As a learner, I can remove items from my cart | High | 2 |
| **CART-004** | As a learner, I can apply a discount code to my cart | Medium | 3 |
| **CART-005** | As a learner, I can see my cart total with taxes/fees | High | 3 |
| **CART-006** | As a learner, I can proceed to checkout from my cart | High | 2 |
| **CART-007** | As a learner, I can checkout as a guest or create account | Medium | 5 |
| **CART-008** | As a learner, I can see if I already own an item in my cart | Medium | 3 |
| **CART-009** | As a system, cart items expire after configurable timeout | Low | 2 |

---

### Epic 3: Payment Processing

> **As a** learner  
> **I want to** pay for my courses using my preferred payment method  
> **So that** I can complete my purchase

| Story ID | Story | Priority | Points |
|----------|-------|----------|--------|
| **PAY-001** | As a learner, I can pay with credit/debit card (Stripe) | High | 8 |
| **PAY-002** | As a learner, I can pay with Google Pay | Medium | 5 |
| **PAY-003** | As a learner, I can pay with Square | Medium | 5 |
| **PAY-004** | As a system, I can process payments through Elavon | Medium | 8 |
| **PAY-005** | As a system, I create an Order record on successful payment | High | 3 |
| **PAY-006** | As a system, I handle payment failures gracefully | High | 5 |
| **PAY-007** | As a system, I send payment confirmation emails | High | 3 |
| **PAY-008** | As a learner, I can view my payment history | Medium | 3 |
| **PAY-009** | As a billing-admin, I can process refunds | High | 5 |
| **PAY-010** | As a system, I support recurring payments for subscriptions | Medium | 8 |
| **PAY-011** | As a system, I log all payment events for audit | High | 3 |

---

### Epic 4: Registration & Approval

> **As a** learner  
> **I want to** register for courses after payment  
> **So that** I can begin learning

| Story ID | Story | Priority | Points |
|----------|-------|----------|--------|
| **REG-001** | As a system, I create registration(s) after successful payment | High | 3 |
| **REG-002** | As a system, I auto-approve registrations when configured | High | 3 |
| **REG-003** | As a dept-admin, I can review pending registrations | High | 5 |
| **REG-004** | As a dept-admin, I can approve a registration | High | 3 |
| **REG-005** | As a dept-admin, I can reject a registration (with reason) | High | 3 |
| **REG-006** | As a dept-admin, I can bulk approve/reject registrations | Medium | 3 |
| **REG-007** | As a learner, I can see my registration status | High | 2 |
| **REG-008** | As a system, I notify learners of approval/rejection | High | 3 |
| **REG-009** | As a system, I auto-refund rejected registrations | Medium | 5 |
| **REG-010** | As a dept-admin, I can set approval requirements per course | Medium | 3 |

---

### Epic 5: Auto-Enrollment

> **As a** learner  
> **I want to** be automatically enrolled after approval  
> **So that** I can start learning immediately

| Story ID | Story | Priority | Points |
|----------|-------|----------|--------|
| **ENR-001** | As a system, I create enrollment on registration approval | High | 3 |
| **ENR-002** | As a system, I send enrollment confirmation email | High | 2 |
| **ENR-003** | As a learner, I can see my enrolled courses | High | 2 |
| **ENR-004** | As a learner, I can access course content after enrollment | High | 3 |
| **ENR-005** | As a system, I track enrollment source (order/registration) | Medium | 2 |
| **ENR-006** | As a system, I support waitlist enrollment | Low | 5 |

---

### Epic 6: Progress Tracking & Completion

> **As a** learner  
> **I want to** track my progress and complete courses  
> **So that** I can earn certificates

| Story ID | Story | Priority | Points |
|----------|-------|----------|--------|
| **PROG-001** | As a learner, I can see my progress in each course | High | 3 |
| **PROG-002** | As a system, I track completion of modules/assessments | High | 5 |
| **PROG-003** | As a system, I mark course complete when criteria met | High | 3 |
| **PROG-004** | As a learner, I can see my program progress (multi-course) | High | 5 |
| **PROG-005** | As a system, I mark program complete when all courses done | High | 3 |

---

### Epic 7: Certificate Generation

> **As a** learner  
> **I want to** receive certificates for completed courses/programs  
> **So that** I can prove my achievements

| Story ID | Story | Priority | Points |
|----------|-------|----------|--------|
| **CERT-001** | As a system, I auto-generate certificate on course completion | High | 5 |
| **CERT-002** | As a system, I auto-generate certificate on program completion | High | 5 |
| **CERT-003** | As a dept-admin, I can customize certificate templates | Medium | 8 |
| **CERT-004** | As a learner, I can view and download my certificates | High | 3 |
| **CERT-005** | As a learner, I can share certificate via link | Medium | 3 |
| **CERT-006** | As a system, I provide certificate verification endpoint | Medium | 3 |
| **CERT-007** | As a dept-admin, I can manually issue certificates | Low | 3 |
| **CERT-008** | As a system, I revoke certificates on refund | Low | 3 |

---

## Data Models

### Core Billing Models

```typescript
/**
 * Pricing configuration for courses/programs
 */
interface ICoursePricing {
  _id: ObjectId;
  courseId?: ObjectId;           // For individual course pricing
  programId?: ObjectId;          // For program bundle pricing
  departmentId: ObjectId;        // Department offering
  
  // Pricing
  priceType: 'one-time' | 'subscription' | 'free';
  currency: string;              // ISO 4217 (USD, EUR, etc.)
  basePrice: number;             // Price in cents (avoid float issues)
  
  // Subscription details (if applicable)
  subscription?: {
    interval: 'monthly' | 'quarterly' | 'annual';
    trialDays?: number;
  };
  
  // Validity
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  
  // Metadata
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shopping Cart (ephemeral)
 */
interface ICart {
  _id: ObjectId;
  userId?: ObjectId;             // Null for guest checkout
  sessionId: string;             // For guest tracking
  
  items: ICartItem[];
  
  // Discount
  discountCode?: string;
  discountAmount: number;        // In cents
  
  // Totals
  subtotal: number;              // In cents
  tax: number;                   // In cents
  total: number;                 // In cents
  
  // Expiration
  expiresAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

interface ICartItem {
  itemType: 'course' | 'program' | 'subscription';
  itemId: ObjectId;              // courseId or programId
  quantity: number;              // Usually 1
  price: number;                 // In cents at time of add
  name: string;                  // Snapshot for display
}

/**
 * Completed Order
 */
interface IOrder {
  _id: ObjectId;
  orderNumber: string;           // Human-readable (ORD-2026-00001)
  userId: ObjectId;
  
  // Items purchased
  items: IOrderItem[];
  
  // Financials
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  tax: number;
  total: number;
  currency: string;
  
  // Payment
  paymentId: ObjectId;           // Reference to Payment record
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' | 'partial-refund';
  
  // Status
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

interface IOrderItem {
  itemType: 'course' | 'program' | 'subscription';
  itemId: ObjectId;
  name: string;
  price: number;
  registrationId?: ObjectId;     // Created after order completes
}

/**
 * Payment Transaction
 */
interface IPayment {
  _id: ObjectId;
  orderId: ObjectId;
  userId: ObjectId;
  
  // Payment processor
  processor: 'stripe' | 'square' | 'gpay' | 'elavon';
  processorTransactionId: string;
  processorResponse?: Record<string, any>;  // Full response for debugging
  
  // Amount
  amount: number;                // In cents
  currency: string;
  
  // Status
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  failureReason?: string;
  
  // Refund tracking
  refundedAmount: number;        // In cents
  refunds: IRefund[];
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

interface IRefund {
  refundId: string;              // Processor refund ID
  amount: number;                // In cents
  reason: string;
  processedBy: ObjectId;
  processedAt: Date;
}

/**
 * Registration (pre-enrollment)
 */
interface IRegistration {
  _id: ObjectId;
  userId: ObjectId;
  
  // What they're registering for
  registrationType: 'course' | 'program';
  courseId?: ObjectId;
  programId?: ObjectId;
  departmentId: ObjectId;
  
  // Source
  orderId?: ObjectId;            // If paid
  orderItemIndex?: number;
  
  // Approval
  approvalRequired: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'enrolled' | 'cancelled';
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  
  // Resulting enrollment
  enrollmentId?: ObjectId;       // Created on approval
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Discount/Coupon Codes
 */
interface IDiscountCode {
  _id: ObjectId;
  code: string;                  // e.g., "SUMMER2026"
  departmentId: ObjectId;
  
  // Type
  discountType: 'percentage' | 'fixed';
  discountValue: number;         // Percentage (0-100) or cents
  
  // Limits
  maxUses?: number;
  usedCount: number;
  maxUsesPerUser?: number;
  
  // Validity
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  
  // Restrictions
  applicableTo: 'all' | 'courses' | 'programs' | 'subscriptions';
  courseIds?: ObjectId[];        // Specific courses only
  programIds?: ObjectId[];       // Specific programs only
  minPurchase?: number;          // Minimum cart total in cents
  
  createdBy: ObjectId;
  createdAt: Date;
}

/**
 * Subscription (for recurring billing)
 */
interface ISubscription {
  _id: ObjectId;
  userId: ObjectId;
  departmentId: ObjectId;
  
  // Plan
  planType: 'monthly' | 'quarterly' | 'annual';
  priceId: ObjectId;             // Reference to CoursePricing
  
  // Status
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused';
  
  // Processor
  processor: 'stripe' | 'square' | 'elavon';
  processorSubscriptionId: string;
  
  // Dates
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  
  // Billing
  lastPaymentId?: ObjectId;
  nextBillingDate: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Certificate Model

```typescript
/**
 * Certificate for course/program completion
 */
interface ICertificate {
  _id: ObjectId;
  certificateNumber: string;     // Unique verifiable ID (CERT-2026-XXXXX)
  
  // Recipient
  userId: ObjectId;
  recipientName: string;         // Snapshot at time of issue
  
  // What was completed
  certificateType: 'course' | 'program';
  courseId?: ObjectId;
  programId?: ObjectId;
  departmentId: ObjectId;
  
  // Details
  title: string;                 // "Certificate of Completion"
  description: string;           // Course/program name
  issuedAt: Date;
  completedAt: Date;             // When learner completed
  
  // Template
  templateId?: ObjectId;         // Custom template if any
  
  // Scores (optional)
  grade?: string;
  percentage?: number;
  
  // Status
  status: 'active' | 'revoked';
  revokedAt?: Date;
  revokedReason?: string;
  
  // Verification
  verificationUrl: string;       // Public verification link
  
  createdAt: Date;
}
```

---

## API Endpoints

### Catalog & Pricing (Public + Admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v2/catalog/courses` | List purchasable courses | Public |
| GET | `/api/v2/catalog/courses/:id` | Course details with pricing | Public |
| GET | `/api/v2/catalog/programs` | List purchasable programs | Public |
| GET | `/api/v2/catalog/programs/:id` | Program details with courses | Public |
| GET | `/api/v2/catalog/departments/:id` | Department subscription info | Public |
| POST | `/api/v2/admin/pricing` | Create/update course pricing | billing-admin |
| GET | `/api/v2/admin/pricing` | List all pricing configurations | billing-admin |
| DELETE | `/api/v2/admin/pricing/:id` | Deactivate pricing | billing-admin |

### Cart & Checkout

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v2/cart` | Get current cart | Optional |
| POST | `/api/v2/cart/items` | Add item to cart | Optional |
| DELETE | `/api/v2/cart/items/:itemId` | Remove item from cart | Optional |
| POST | `/api/v2/cart/discount` | Apply discount code | Optional |
| DELETE | `/api/v2/cart/discount` | Remove discount code | Optional |
| POST | `/api/v2/cart/checkout` | Begin checkout process | Required |

### Payment Processing

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v2/payments/create-intent` | Create payment intent (Stripe) | Required |
| POST | `/api/v2/payments/confirm` | Confirm payment completed | Required |
| POST | `/api/v2/payments/webhook/:processor` | Processor webhooks | Webhook Auth |
| GET | `/api/v2/payments/history` | User's payment history | Required |
| POST | `/api/v2/admin/payments/:id/refund` | Process refund | billing-admin |

### Registration & Approval

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v2/registrations` | User's registrations | Required |
| GET | `/api/v2/registrations/:id` | Registration details | Required |
| GET | `/api/v2/admin/registrations` | Pending registrations (dept) | enrollment-admin |
| POST | `/api/v2/admin/registrations/:id/approve` | Approve registration | enrollment-admin |
| POST | `/api/v2/admin/registrations/:id/reject` | Reject registration | enrollment-admin |
| POST | `/api/v2/admin/registrations/bulk` | Bulk approve/reject | enrollment-admin |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v2/orders` | User's orders | Required |
| GET | `/api/v2/orders/:id` | Order details | Required |
| GET | `/api/v2/admin/orders` | All orders (filterable) | billing-admin |
| GET | `/api/v2/admin/orders/:id` | Order admin view | billing-admin |

### Certificates

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v2/certificates` | User's certificates | Required |
| GET | `/api/v2/certificates/:id` | Certificate details | Required |
| GET | `/api/v2/certificates/:id/download` | Download PDF | Required |
| GET | `/api/v2/certificates/verify/:number` | Public verification | Public |
| POST | `/api/v2/admin/certificates` | Manual issue | dept-admin |
| POST | `/api/v2/admin/certificates/:id/revoke` | Revoke certificate | dept-admin |

### Subscriptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v2/subscriptions` | User's subscriptions | Required |
| POST | `/api/v2/subscriptions` | Create subscription | Required |
| POST | `/api/v2/subscriptions/:id/cancel` | Cancel subscription | Required |
| POST | `/api/v2/subscriptions/:id/pause` | Pause subscription | Required |
| GET | `/api/v2/admin/subscriptions` | All subscriptions | billing-admin |

---

## Payment Processor Integration

### Architecture: Payment Processor Abstraction

```typescript
/**
 * Payment Processor Interface
 * All payment processors must implement this interface
 */
interface IPaymentProcessor {
  name: 'stripe' | 'square' | 'gpay' | 'elavon';
  
  /**
   * Create a payment intent/session
   */
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  
  /**
   * Confirm a payment
   */
  confirmPayment(intentId: string): Promise<PaymentConfirmation>;
  
  /**
   * Process a refund
   */
  processRefund(params: RefundParams): Promise<RefundResult>;
  
  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): boolean;
  
  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: any): WebhookEvent;
  
  /**
   * Create subscription (if supported)
   */
  createSubscription?(params: SubscriptionParams): Promise<SubscriptionResult>;
  
  /**
   * Cancel subscription (if supported)
   */
  cancelSubscription?(subscriptionId: string): Promise<void>;
}

interface CreatePaymentParams {
  amount: number;           // In cents
  currency: string;
  orderId: string;
  customerId?: string;      // Processor customer ID
  metadata?: Record<string, string>;
  returnUrl?: string;       // For redirect-based flows
}

interface PaymentIntent {
  intentId: string;         // Processor's intent ID
  clientSecret?: string;    // For client-side confirmation (Stripe)
  redirectUrl?: string;     // For redirect flows
  status: 'requires_payment' | 'requires_confirmation' | 'succeeded' | 'failed';
}
```

### Processor Implementations

```
src/services/payments/
├── payment.service.ts           # Main service (uses processors)
├── payment-processor.interface.ts
├── processors/
│   ├── stripe.processor.ts
│   ├── square.processor.ts
│   ├── gpay.processor.ts
│   └── elavon.processor.ts
└── payment-processor.factory.ts # Factory to get processor
```

### Processor Comparison

| Feature | Stripe | Square | GPay | Elavon |
|---------|--------|--------|------|--------|
| Cards | ✅ | ✅ | ✅ | ✅ |
| Subscriptions | ✅ | ✅ | ❌ | Limited |
| Webhooks | ✅ | ✅ | ✅ | ✅ |
| Refunds | ✅ | ✅ | ✅ | ✅ |
| Mobile Wallets | ✅ | ✅ | Native | ✅ |
| Test Mode | ✅ | ✅ | ✅ | ✅ |
| PCI Compliance | SAQ-A | SAQ-A | SAQ-A | SAQ-A |

### Configuration

```typescript
// Environment variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...

GPAY_MERCHANT_ID=...
GPAY_ENVIRONMENT=TEST|PRODUCTION

ELAVON_MERCHANT_ID=...
ELAVON_USER_ID=...
ELAVON_PIN=...
ELAVON_DEMO=true|false
```

---

## Workflow State Machines

### Registration State Machine

```
                    ┌─────────────┐
                    │   PENDING   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │   APPROVED   │ │ REJECTED │ │  CANCELLED   │
    └──────┬───────┘ └──────────┘ └──────────────┘
           │
           ▼
    ┌──────────────┐
    │   ENROLLED   │
    └──────────────┘

Transitions:
- PENDING → APPROVED (admin approval or auto-approve)
- PENDING → REJECTED (admin rejection)
- PENDING → CANCELLED (user cancellation or timeout)
- APPROVED → ENROLLED (auto-enroll on approval)
```

### Order State Machine

```
    ┌─────────────┐
    │   PENDING   │ ← Cart checkout initiated
    └──────┬──────┘
           │
           ├─────────────────┐
           ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │  COMPLETED   │  │   FAILED     │
    └──────┬───────┘  └──────────────┘
           │
           ├─────────────────┐
           ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │   REFUNDED   │  │  CANCELLED   │
    └──────────────┘  └──────────────┘

Transitions:
- PENDING → COMPLETED (payment succeeded)
- PENDING → FAILED (payment failed)
- COMPLETED → REFUNDED (full refund)
- COMPLETED → CANCELLED (admin cancellation)
```

### Payment State Machine

```
    ┌─────────────┐
    │   PENDING   │ ← Intent created
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ PROCESSING  │ ← User submitting payment
    └──────┬──────┘
           │
           ├─────────────────┐
           ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │  SUCCEEDED   │  │   FAILED     │
    └──────────────┘  └──────────────┘
```

---

## Certificate Generation

### Completion Criteria

```typescript
interface ICompletionCriteria {
  courseId: ObjectId;
  
  // What needs to be completed
  requirements: {
    type: 'all-modules' | 'percentage' | 'specific-modules';
    
    // For 'percentage' type
    minPercentage?: number;           // e.g., 80
    
    // For 'specific-modules' type
    requiredModuleIds?: ObjectId[];
    
    // Assessment requirements
    passingScore?: number;            // Minimum score on final assessment
    assessmentId?: ObjectId;          // Specific assessment required
  };
  
  // Time requirements
  minTimeSpent?: number;              // Minutes
  
  // Expiration
  validFor?: number;                  // Days until cert expires (0 = never)
}
```

### Certificate Template System

```typescript
interface ICertificateTemplate {
  _id: ObjectId;
  departmentId: ObjectId;
  name: string;
  
  // Design
  backgroundImage?: string;          // S3 URL
  layout: 'portrait' | 'landscape';
  
  // Text blocks
  titleText: string;                 // "Certificate of Completion"
  bodyTemplate: string;              // "This certifies that {{recipientName}}..."
  
  // Signatures
  signatures: {
    name: string;
    title: string;
    signatureImage?: string;
  }[];
  
  // Styling
  fontFamily: string;
  primaryColor: string;
  
  isDefault: boolean;
  createdBy: ObjectId;
  createdAt: Date;
}
```

### Auto-Generation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                CERTIFICATE AUTO-GENERATION                        │
└──────────────────────────────────────────────────────────────────┘

  1. Learner completes final module/assessment
                    │
                    ▼
  2. ProgressService.checkCompletion(enrollmentId)
                    │
                    ▼
  3. Is completion criteria met?
        │                    │
       NO                   YES
        │                    │
        ▼                    ▼
     (wait)         4. CertificateService.generate({
                        enrollmentId,
                        userId,
                        courseId,
                        completedAt
                    })
                             │
                             ▼
                    5. Generate unique certificate number
                             │
                             ▼
                    6. Create ICertificate record
                             │
                             ▼
                    7. Render PDF (optional - on-demand)
                             │
                             ▼
                    8. Send notification email
                             │
                             ▼
                    9. Certificate available in learner profile
```

---

## Phase Breakdown

### Phase 1: Core Infrastructure (Weeks 1-2)

**Focus:** Data models, basic catalog, pricing

| Task | Priority | Est. |
|------|----------|------|
| Create CoursePricing model | High | 4h |
| Create Cart model | High | 4h |
| Create Order model | High | 4h |
| Create Payment model | High | 4h |
| Create Registration model | High | 4h |
| Create Discount model | Medium | 3h |
| Catalog API (public courses/programs) | High | 6h |
| Pricing admin API | High | 4h |
| Unit tests for models | High | 8h |

**Deliverable:** Catalog browsable, pricing configurable

---

### Phase 2: Cart & Checkout (Weeks 3-4)

**Focus:** Shopping cart, checkout flow

| Task | Priority | Est. |
|------|----------|------|
| Cart service (add/remove/update) | High | 6h |
| Cart API endpoints | High | 4h |
| Discount code validation | Medium | 4h |
| Checkout initiation | High | 4h |
| Guest checkout flow | Medium | 6h |
| Cart expiration job | Low | 3h |
| Integration tests | High | 8h |

**Deliverable:** Users can build cart and initiate checkout

---

### Phase 3: Payment Integration - Stripe (Weeks 5-6)

**Focus:** First payment processor integration

| Task | Priority | Est. |
|------|----------|------|
| Payment processor interface | High | 4h |
| Stripe processor implementation | High | 12h |
| Create payment intent flow | High | 6h |
| Webhook handler | High | 6h |
| Order creation on success | High | 4h |
| Failure handling | High | 4h |
| Refund processing | High | 4h |
| Integration tests (with Stripe test mode) | High | 8h |

**Deliverable:** Full payment flow with Stripe

---

### Phase 4: Registration & Approval (Weeks 7-8)

**Focus:** Post-payment registration flow

| Task | Priority | Est. |
|------|----------|------|
| Registration creation on order complete | High | 4h |
| Auto-approval configuration | High | 4h |
| Admin approval API | High | 6h |
| Rejection with refund | High | 6h |
| Notification system | High | 6h |
| Bulk operations | Medium | 4h |
| Integration tests | High | 8h |

**Deliverable:** Registrations created, admin can approve/reject

---

### Phase 5: Auto-Enrollment (Week 9)

**Focus:** Enrollment on approval

| Task | Priority | Est. |
|------|----------|------|
| Enrollment service integration | High | 4h |
| Auto-enroll on approval | High | 4h |
| Program multi-course enrollment | High | 6h |
| Welcome email notifications | High | 3h |
| Integration tests | High | 4h |

**Deliverable:** Approved registrations auto-enroll

---

### Phase 6: Certificate System (Weeks 10-11)

**Focus:** Certificate generation

| Task | Priority | Est. |
|------|----------|------|
| Certificate model | High | 3h |
| Certificate template model | Medium | 4h |
| Completion criteria checking | High | 6h |
| Auto-generation service | High | 8h |
| PDF rendering (PDFKit/Puppeteer) | High | 8h |
| Verification endpoint | High | 3h |
| Certificate API | High | 4h |
| Revocation handling | Medium | 3h |
| Integration tests | High | 6h |

**Deliverable:** Certificates auto-generated on completion

---

### Phase 7: Additional Payment Processors (Week 12)

**Focus:** Square, GPay, Elavon

| Task | Priority | Est. |
|------|----------|------|
| Square processor | Medium | 8h |
| GPay processor | Medium | 8h |
| Elavon processor | Medium | 10h |
| Processor selection UI support | Medium | 4h |
| Integration tests per processor | Medium | 8h |

**Deliverable:** Multiple payment options available

---

### Phase 8: Subscriptions (Future)

**Focus:** Recurring billing

| Task | Priority | Est. |
|------|----------|------|
| Subscription model | Medium | 4h |
| Subscription creation | Medium | 6h |
| Recurring payment handling | Medium | 8h |
| Subscription management | Medium | 6h |
| Cancellation/pause | Medium | 4h |
| Grace period handling | Medium | 4h |

**Deliverable:** Department subscription access

---

## Security Considerations

### PCI Compliance

- **Never store raw card numbers** - Use tokenization (Stripe Elements, Square Web SDK)
- **SAQ-A Eligible** - All card data handled by processor's hosted fields
- **HTTPS Required** - All payment endpoints over TLS 1.2+

### Financial Audit

- **Immutable payment records** - No DELETE, UPDATE only for status
- **Complete audit trail** - All actions logged with actor, timestamp
- **Reconciliation support** - Export capabilities for accounting

### Fraud Prevention

- **Rate limiting** - On checkout/payment endpoints
- **Velocity checks** - Multiple failed payments trigger review
- **Address verification** - AVS checks where supported
- **3D Secure** - Enabled for high-risk transactions

### Data Protection

- **PII handling** - Encrypt sensitive financial data at rest
- **Webhook verification** - Verify signatures on all processor webhooks
- **Token expiration** - Cart sessions and payment intents expire

---

## Open Questions

### Business Questions

1. **Refund Policy** - Full refund only? Partial? Time limits?
2. **Tax Calculation** - Use TaxJar/Avalara? Manual configuration?
3. **Multi-Currency** - Support or single currency?
4. **Invoicing** - Need formal invoices for business customers?
5. **Payment Plans** - Allow installment payments?

### Technical Questions

1. **PDF Generation** - Server-side (PDFKit) vs headless browser (Puppeteer)?
2. **Email Provider** - SendGrid? AWS SES? Existing solution?
3. **Background Jobs** - Bull? Agenda? For async processing
4. **Primary Processor** - Start with Stripe as default?
5. **Reporting** - Build in-house or integrate with analytics platform?

### Scope Questions

1. **Guest Checkout** - Allow or require account first?
2. **Corporate/Bulk Purchases** - Support for group enrollments?
3. **Gift Purchases** - Buy for someone else?
4. **Waitlist** - Capacity-limited courses?

---

## Related Documents

- [COURSE_ROLE_FUNCTION_MATRIX.md](../ui/specs/COURSE_ROLE_FUNCTION_MATRIX.md) - Role permissions for billing-admin
- [API-ISS-021](./ISSUE_QUEUE.md) - billing-admin course view access
- Contracts: TBD

---

**Document Status:** DRAFT - Pending Review

**Next Steps:**
1. Review and answer open questions
2. Prioritize Phase 1 stories
3. Create API-ISS-XXX issues for implementation
4. Design UI mockups for checkout flow
