# Migration and Schema Verification Report

**Execution Date:** November 24, 2026  
**Auditor:** Senior Staff Database Architect & Repository Integrator  
**Database:** PostgreSQL (verified against container `obpark_test_pg` on port 5435)  
**ORM:** Prisma Client v7.8.0  
**Target Migration Path:** `prisma/migrations/`  

---

## 1. Executive Summary

This report documents the schema analysis, reconciliation, and forward-only migration strategy applied to incorporate the extended **Module 25 (Mechanic Service Warranty & Claims Workflow)** into authoritative backend target `origin/integration/final-all`.

### Key Finding
The candidate branch `feature/mechanic-settlement-warranty` contained three legacy migrations (`20261114120000_add_mechanic_warranty_ledger`, `20261117120000_add_warranty_claim_workflow`, `20261118120000_add_warranty_followup_escalation`) that:
1. **Collided with already applied migrations:** The target branch already contained `20261118120000_add_mechanic_warranty`, which had established the base `ServiceWarranty` table and base `WarrantyStatus` enum (`ACTIVE`, `EXPIRED`, `CLAIMED`, `VOID`).
2. **Violated migration ordering:** Two of the feature branch migrations had historical timestamps (`20261114...` and `20261117...`) that preceded migrations already deployed to staging/production (`20261116...`, `20261117...`). Blindly copying them would corrupt the migration history lockfile (`migration_lock.toml`).

### Remediation Strategy
Following the core safety mandate (*"Produce valid, uniquely named migrations compatible with the target migration history. Do not blindly copy old migrations or create duplicate tables"*), a **single, forward-only, strictly additive migration** was engineered:
`20261124140000_extend_warranty_claim_and_followup`

---

## 2. Migration History Reconciliation

### 2.1 Complete Authoritative Migration Order (Total: 27 Migrations)

| Step | Migration Directory | Scope | Type |
|---|---|---|---|
| 01 | `20260711150043_init` | Initial base schema | Baseline |
| 02 | `20260722195853_add_profile_fields` | Profile enhancements | Additive |
| 03 | `20261013090000_auth_roles_and_crew` | Roles and crew models | Additive |
| 04 | `20261013140000_baseline_commerce_and_entities` | Commerce catalog and orders | Additive |
| 05 | `20261016000000_modules_integration` | Module interconnections | Additive |
| 06 | `20261016010000_crew_review_audit` | Crew review and audit trails | Additive |
| 07 | `20261017000000_remove_legacy_user_model` | Schema cleanup | Refactor |
| 08 | `20261017153305_add_user_device` | Push notification device tokens | Additive |
| 09 | `20261019000000_add_booking_and_customer_blueprint` | Core booking blueprint | Additive |
| 10 | `20261023000000_align_crew_service_type_enum` | Service type enum reconciliation | Alignment |
| 11 | `20261104140000_add_quality_loop_ratings_incidents` | Ratings and incident models | Additive |
| 12 | `20261106140000_add_crew_wallet_payout_record` | Crew wallet and ledger | Additive |
| 13 | `20261108000000_add_booking_payment_capture` | Razorpay payment integration | Additive |
| 14 | `20261110053120_add_in_app_notification_inbox` | In-app notification inbox | Additive |
| 15 | `20261111181800_add_booking_invoice_ledger` | Trip invoices and PDF ledger | Additive |
| 16 | `20261112174722_add_vendor_fleet_domain` | Corporate vendor fleet domain | Additive |
| 17 | `20261114073000_add_scheduled_booking_lifecycle` | Scheduled booking lifecycle | Additive |
| 18 | `20261114120000_add_surge_rules_engine` | Dynamic surge pricing engine | Additive |
| 19 | `20261116000000_add_mechanic_problem_intake_fields` | Mechanic breakdown symptoms | Additive |
| 20 | `20261116145517_add_vendor_verification_and_invites` | Vendor verification and invites | Additive |
| 21 | `20261116183200_add_mechanic_repair_quotation_ledger` | Mechanic quotation ledger | Additive |
| 22 | `20261117090000_reconcile_legacy_address_model` | Address model reconciliation | Additive |
| 23 | `20261117120000_add_mechanic_dispatch_eta` | Mechanic dispatch ETA fields | Additive |
| 24 | `20261118000000_align_commerce_schema` | Commerce catalog alignment | Additive |
| 25 | `20261118120000_add_mechanic_warranty` | Base 7-day service warranty | Additive |
| 26 | `20261118140000_add_category_display_images` | Category display assets | Additive |
| **27** | **`20261124140000_extend_warranty_claim_and_followup`** | **Extended warranty claims, review audit & follow-up escalation** | **Consolidated Additive** |

---

## 3. Forward-Only Migration Implementation

### 3.1 Migration File: `prisma/migrations/20261124140000_extend_warranty_claim_and_followup/migration.sql`

```sql
-- Extend Module 25: Mechanic Service Warranty Claim Workflow & Follow-Up Escalation

-- AlterEnum
ALTER TYPE "WarrantyStatus" ADD VALUE 'UNDER_INSPECTION';
ALTER TYPE "WarrantyStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "WarrantyStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "ServiceWarranty"
ADD COLUMN "reviewedByAdminId" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "followUpBookingId" TEXT,
ADD COLUMN "followUpEscalatedAt" TIMESTAMP(3),
ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceWarranty_followUpBookingId_key" ON "ServiceWarranty"("followUpBookingId");
CREATE INDEX "ServiceWarranty_status_idx" ON "ServiceWarranty"("status");

-- AddForeignKey
ALTER TABLE "ServiceWarranty" ADD CONSTRAINT "ServiceWarranty_reviewedByAdminId_fkey" 
  FOREIGN KEY ("reviewedByAdminId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceWarranty" ADD CONSTRAINT "ServiceWarranty_followUpBookingId_fkey" 
  FOREIGN KEY ("followUpBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 4. Prisma Schema Model & Relation Architecture

### 4.1 `WarrantyStatus` Enum
```prisma
enum WarrantyStatus {
  ACTIVE            // Issued upon mechanic booking completion, valid for 7 days
  EXPIRED           // 7-day workmanship window passed without incident
  CLAIMED           // Customer filed a claim; pending admin review
  UNDER_INSPECTION  // Admin approved claim; free follow-up visit dispatched
  RESOLVED          // Free follow-up visit completed; claim resolved
  REJECTED          // Admin reviewed and rejected claim with audit reason
  VOID              // Voided by admin (e.g., fraudulent filing or chargeback)
}
```

### 4.2 `ServiceWarranty` Model
```prisma
model ServiceWarranty {
  id           String  @id @default(uuid())
  warrantyCode String  @unique // e.g. "WAR-2026-482913"
  bookingId    String  @unique
  booking      Booking @relation("BookingWarranty", fields: [bookingId], references: [id], onDelete: Cascade)

  customerId String
  customer   Users  @relation("CustomerWarranties", fields: [customerId], references: [id], onDelete: Cascade)

  mechanicProfileId String
  mechanicProfile   CrewProfile @relation("MechanicWarranties", fields: [mechanicProfileId], references: [id], onDelete: Cascade)

  startDate   DateTime       @default(now())
  expiresAt   DateTime       // startDate + 7 days
  status      WarrantyStatus @default(ACTIVE)
  claimReason String?
  claimedAt   DateTime?

  // Claim review audit (Admin)
  reviewedByAdminId String?
  reviewedByAdmin   Users?    @relation("WarrantyReviewer", fields: [reviewedByAdminId], references: [id], onDelete: SetNull)
  reviewedAt        DateTime?
  rejectionReason   String?

  // Free follow-up visit created when a claim is approved
  followUpBookingId   String?   @unique
  followUpBooking     Booking?  @relation("WarrantyFollowUp", fields: [followUpBookingId], references: [id], onDelete: SetNull)
  followUpEscalatedAt DateTime? // Timestamp when follow-up was offered to other mechanics
  resolvedAt          DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([customerId, status])
  @@index([mechanicProfileId])
  @@index([expiresAt])
  @@index([status])
}
```

### 4.3 Relation Disambiguation in `Booking`
Because `Booking` and `ServiceWarranty` share two distinct 1-to-1 relationships, explicit relation tags are defined:
- `booking.warranty`: The original 7-day workmanship warranty issued for this job (`@relation("BookingWarranty")`).
- `booking.warrantyFollowUp`: The warranty this booking serves as a free inspection/repair follow-up visit for (`@relation("WarrantyFollowUp")`).

---

## 5. Verification Evidence

### 5.1 Schema Validation
```bash
pnpm exec prisma validate
```
**Output:**
```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
The schema at prisma/schema.prisma is valid 🚀
```

### 5.2 Client Generation
```bash
pnpm run prisma:generate
```
**Output:**
```
✔ Generated Prisma Client (v7.8.0) to ./node_modules/@prisma/client in 572ms
```

### 5.3 Test Database Migration Execution
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/obpark_test?schema=public" pnpm exec prisma migrate deploy
```
**Output:**
```
27 migrations found in prisma/migrations
Applying migration `20261124140000_extend_warranty_claim_and_followup`
The following migration(s) have been applied:
migrations/
  └─ 20261124140000_extend_warranty_claim_and_followup/
    └─ migration.sql
All migrations have been successfully applied.
```

---

## 6. Data Safety & Compatibility Guarantee

1. **Non-Destructive:** No existing tables, columns, constraints, or rows are dropped or altered.
2. **Backward-Compatible:** All newly added columns (`reviewedByAdminId`, `reviewedAt`, `rejectionReason`, `followUpBookingId`, `followUpEscalatedAt`, `resolvedAt`) are nullable (`NULL`). Existing warranty records retain their exact values and remain valid `ACTIVE` or `EXPIRED` records.
3. **Foreign Key Integrity:** `onDelete: SetNull` ensures that deleting an admin user or follow-up booking will not delete the historical warranty claim audit record.
4. **Idempotency:** Unique index on `followUpBookingId` guarantees that a single follow-up booking can only resolve one warranty claim.
