# Test and Regression Results Report

**Execution Date:** November 24, 2026  
**Auditor:** QA Lead & Release Engineer  
**Environments:** Node.js v20+, PostgreSQL 16 (Port 5435), Vitest 5.1.1, Jest Circus 30.4.2  

---

## 1. Executive Summary

Comprehensive unit, integration, end-to-end, typecheck, lint, and production build suites were executed across both `obpark-backend` and `obcrew-admin`.

| Project | Suite | Status | Suites Passed | Tests Passed | Failures | Execution Time |
|---|---|---|---|---|---|---|
| **Backend** | Unit Tests (`pnpm test`) | **PASS** | 62 / 62 | 653 / 653 | 0 | 12.085 s |
| **Backend** | E2E Tests (`pnpm test:e2e`) | **PASS** | 6 / 6 | 89 / 89 | 0 | 18.444 s |
| **Backend** | TypeScript & Nest Build | **PASS** | — | — | 0 | ~5 s |
| **Backend** | ESLint (`pnpm lint:check`) | **PASS** | — | — | 0 errors (15 warnings) | ~4 s |
| **Frontend** | Typecheck (`tsc --noEmit`) | **PASS** | — | — | 0 | ~3 s |
| **Frontend** | ESLint (`pnpm lint`) | **PASS** | — | — | 0 | ~2 s |
| **Frontend** | Vitest (`pnpm exec vitest run`) | **PASS** | 5 / 5 | 30 / 30 | 0 | 215 ms |
| **Frontend** | Next.js Production Build | **PASS** | 11 / 11 routes | — | 0 | ~14 s |

---

## 2. Backend Test Suites Breakdown

### 2.1 Extended Mechanic Warranty Test Suite (`mechanic-warranty.service.spec.ts`)
- **Status:** **PASS** (38 tests passed, 0 failures, Time: 2.295s)
- **Key Assertions Verified:**
  1. `issueWarranty`: Creates 7-day workmanship warranty with `WAR-YYYY-<code>` exclusively for `MECHANIC` service type; ignores `DRIVER` service.
  2. `notifyWarrantyIssued`: Dispatches notifications safely through dual channels (Module 16 inbox + push) with deduplication keys; fail-safe against notification transport errors.
  3. `getWarrantyDetails`: Validates active certificate, days remaining, mechanic profile, and covered parts list from approved `RepairQuote`.
  4. `fileWarrantyClaim`: Enforces 7-day eligibility window, customer ownership, and "one claim per warranty" constraint. Concurrency-safe against race conditions.
  5. `listClaims`: Paginated query filtered by `WarrantyStatus`.
  6. `rejectClaim`: Records reviewing admin, audit reason, transitions status to `REJECTED`, and notifies customer and mechanic.
  7. `approveClaim`: Transitions status to `UNDER_INSPECTION` and creates a free follow-up booking mapped to original location and mechanic.
  8. `escalateUnacceptedFollowUps`: Automatically escalates follow-up to nearby mechanics after 30-minute timeout.
  9. `completeFollowUp`: Slices follow-up payout (₹0 for original mechanic, flat platform fee for third-party mechanic) and transitions claim to `RESOLVED`.
  10. `expireWarranties`: Daily sweep transitions active warranties past 7 days to `EXPIRED`.

### 2.2 Booking Service Test Suite (`booking.service.spec.ts`)
- **Status:** **PASS** (26 tests passed, 0 failures, Time: 1.458s)
- **Key Assertions Verified:**
  1. `completeBooking`: Slices commission split (85/15 direct or 70/15/15 tri-party).
  2. Follow-up detection: Accurately detects whether a mechanic booking is a free warranty follow-up. Prevents redundant second warranties from being issued.
  3. Post-commit notifications: `notifyClaimResolved` and `notifyWarrantyIssued` called strictly after database transaction commits.
  4. Concurrency guard: Rejects concurrent completion attempts atomically.

### 2.3 Financial Ledgers & Concurrency Test Suites
- `vendor-wallet.service.spec.ts`: **PASS** (9 tests passed). Validates `Serializable` transaction isolation level on payout settlement and verifies affected earning counts.
- `crew-wallet.service.spec.ts`: **PASS** (13 tests passed). Validates `GET /admin/billing/summary` UTC month bounds (`cycle=YYYY-MM`), cycle-scoped vs all-time platform commissions, and historical booking splits on `GET /crew/wallet/ledger/all`.
- `vendor-verification.service.spec.ts`: **PASS** (10 tests passed). Validates strict separation of `ACTION_REQUIRED` vs `REJECTED` audit semantics.

### 2.4 End-to-End Test Suite (`pnpm test:e2e --runInBand`)
- **Database:** Isolated PostgreSQL test container `obpark_test_pg` (`127.0.0.1:5435/obpark_test`).
- **Suites Executed:**
  - `test/integration-scenarios.e2e-spec.ts`: Complete multi-step customer journey (cart, checkout, payment, booking lifecycle).
  - `test/auth.e2e-spec.ts`: Authentication, JWT issuance, refresh token rotation, role verification.
  - `test/crew-wallet.e2e-spec.ts`: Payout recording, external disbursal tracking, ledger audit.
  - `test/bootstrap-superadmin.e2e-spec.ts`: Superadmin idempotency, concurrent bootstrap protection, credential rotation.
  - `test/auth-jwks.e2e-spec.ts`: JWKS cryptographic token verification.
  - `test/app.e2e-spec.ts`: Root health and latency endpoints.
- **Result:** 6 passed, 6 total (89 passed, 89 total, 0 failures).

---

## 3. Frontend Test Suites Breakdown

### 3.1 Vitest Unit & Contract Suite (`pnpm exec vitest run`)
- **Status:** **PASS** (5 files passed, 30 tests passed, Time: 215ms)
- **Suites Executed:**
  1. `tests/incident-workflow.test.ts` (4 tests): Quality loop, incident state transitions (`OPEN` -> `UNDER_REVIEW` -> `RESOLVED`), rejection of unauthorized financial penalties.
  2. `tests/settlements-workflow.test.ts` (11 tests):
     - API Contract: Validates `GET /crew/wallet/ledger/all` parses `response.transactions`, pagination metadata (`page`, `limit`, `totalPages`, `total`), and URL search parameter alignment (`page`, `limit`, `startDate`, `endDate`, `status`).
     - API Contract: Validates `GET /admin/billing/summary` UTC month bounds (`YYYY-MM`), explicit commission fields (`cycleCommission`, `allTimePlatformCommission`), and cycle date ranges.
     - External Disbursal Safety: Verifies external banking disbarment notice constraint.
  3. `tests/vendor-workflow.test.ts` (9 tests): Vendor verification flows, KYC document approval/rejection, driver linking modal authorization.
  4. `tests/auth-roles.test.ts` (4 tests): Route protection, admin role enforcement, multi-role fallback.
  5. `tests/api-resilience.test.ts` (2 tests): Network error interceptors, 401 token refresh retry loop.

### 3.2 Next.js Production Build
```
Route (app)                              Size     First Load JS
┌ ○ /                                    138 B          87.3 kB
├ ○ /_not-found                          870 B            88 kB
├ ○ /admin                               2.42 kB        96.9 kB
├ ○ /admin/crew                          5.28 kB         137 kB
├ ƒ /admin/crew/[id]                     7.44 kB         140 kB
├ ○ /admin/incidents                     11.4 kB         110 kB
├ ○ /admin/live-map                      2.23 kB        89.4 kB
├ ○ /admin/settlements                   12.1 kB         111 kB
├ ○ /admin/vendors                       41.1 kB         145 kB
├ ƒ /admin/vendors/[id]                  22.1 kB         128 kB
└ ○ /login                               3.92 kB        94.8 kB
+ First Load JS shared by all            87.2 kB
```
- **Result:** Successfully compiled all 11 static and server-rendered routes with 0 errors.

---

## 4. Zero Regression Confirmation

1. **Catalog & Cart Operations:** Restored fallback in `ProductsService` ensures catalog endpoints and E2E cart tests pass reliably.
2. **Payment & Webhooks:** Razorpay order generation, signature verification, and webhook handlers verified in unit and E2E specs.
3. **Dispatch & Maps Bridge:** Telemetry client, internal key validation, and offline fail-open guards verified.
4. **Invoice Engine:** PDF invoice worker queue, BullMQ retry logic, and reconciliation scheduler pass all test assertions.
5. **Quality & Disputes:** Incident filing, review, resolution, and dismissal contracts verified.
