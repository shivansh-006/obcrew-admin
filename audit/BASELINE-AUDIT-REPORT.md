# OBCREW Admin — Baseline Audit Report (Phase 1)
**Date:** November 24, 2026  
**Auditor:** Lead Full-Stack Integration Engineer  
**Status:** COMPLETE — PRE-INTEGRATION BASELINE  

---

## 1. Repository State & Branch Ancestry

### 1.1 Frontend: `shivansh-006/obcrew-admin`
- **Main HEAD:** `ea3485e` ("fix(incidents): remove Module 12 text from page header")
- **Initial Commit:** `4859c81` ("project initialisation")
- **Active Developer Branches:**
  1. `feat/dev-3-vendor-fleet` (commit `6b91b8f`, branched from `4859c81`, open PR #2)
  2. `feat/dev4-settlements-and-incidents` (commit `90a2e3a`, branched from `ea3485e`, open PR #1)
- **Local Workspace Baseline Verification:**
  - `pnpm install --frozen-lockfile`: PASS (424 packages, zero supply-chain violations)
  - `pnpm exec tsc --noEmit`: PASS (0 errors)
  - `pnpm lint`: PASS (0 warnings, 0 errors)

### 1.2 Backend: `shivansh-006/obpark-backend`
- **Authoritative Branch:** `origin/integration/final-all` (commit `d190e84` - "Merge pull request #35 from shivansh-006/feat/dev-1-crew-kyc")
- **Role Enforcement & Guard Architecture:**
  - Guards: `JwtAuthGuard`, `RolesGuard`
  - Roles Constants: `ADMIN_LOGIN_ROLES` (`ADMIN_OBCREW`, `ADMIN_OBPARK`, `SUPER_ADMIN_OBCREW`, `SUPER_ADMIN_OBPARK`), plus `VENDOR`, `DRIVER`, `MECHANIC`, `CUSTOMER`

---

## 2. Open Pull Requests & Change Surface

### PR #1 — `feat/dev4-settlements-and-incidents`
- **Author:** Raj Verma (`rajvermause@gmail.com`)
- **Base:** `main` (`ea3485e`)
- **Additions/Deletions:** +3,660 / -38 across 15 files
- **Scope:**
  - Multi-tab Settlements desk (`app/admin/settlements/page.tsx`)
  - Incident Desk components (`components/incidents/DisputeResolutionModal.tsx`, `IncidentDetailModal.tsx`, `IncidentsDesk.tsx`)
  - React Query Provider (`components/providers/QueryProvider.tsx`) & Root integration (`app/layout.tsx`)
  - API client & hooks (`lib/api/client.ts`, `lib/api/incidents.ts`, `lib/api/settlements.ts`, `hooks/useIncidents.ts`, `hooks/useSettlements.ts`)
  - Settlement Payout modal (`components/settlements/PayoutConfirmationModal.tsx`)
  - Types definitions (`types/incidents.ts`, `types/settlements.ts`)

### PR #2 — `feat/dev-3-vendor-fleet`
- **Author:** Raj Kumar (`raj@obrive.com`)
- **Base:** `4859c81`
- **Additions/Deletions:** +1,444 / -174 across 8 files
- **Scope:**
  - Vendor directory with cards & status chips (`app/admin/vendors/page.tsx`)
  - Vendor agency detail profile & driver table (`app/admin/vendors/[id]/page.tsx`)
  - Driver invitation modal (`components/vendors/InviteDriverModal.tsx`) using `@radix-ui/react-dialog`
  - Route authentication guard in `app/admin/layout.tsx`
  - Auth hook enhancements in `hooks/useAuth.ts`
  - Added `@radix-ui/react-dialog@^1.3.1` in `package.json` and lockfile

---

## 3. Backend Contract Verification Matrix

| Domain | Target Endpoint | Backend Registered? | Controller / Method | Authorization Roles | Status / Defect Finding |
|---|---|---|---|---|---|
| **Auth** | `POST /auth/admin/login` | **YES** | `AuthController.adminLogin` | Public | **PASS** — Issues `{ accessToken, refreshToken, user }`. |
| **Auth** | `POST /auth/refresh` | **YES** | `AuthController.refresh` | Public | **PASS** — Rotates refresh token via `{ refreshToken }`. |
| **Auth** | `POST /auth/logout` | **YES** | `AuthController.logout` | Authenticated Bearer | **PASS** — Invalidates refresh token session. |
| **Vendor Admin** | `GET /admin/vendors/pending` | **YES** | `VendorVerificationController.listPending` | `ADMIN_OBPARK`, `SUPER_ADMIN_OBPARK` | **PASS** — Returns agencies with `status = PENDING_VERIFICATION`. |
| **Vendor Admin** | `GET /admin/vendors/:id/details` | **YES** | `VendorVerificationController.getDetails` | `ADMIN_OBPARK`, `SUPER_ADMIN_OBPARK` | **PASS** — Full agency profile including documents and fleet members. |
| **Vendor Admin** | `PATCH /admin/vendors/:id/verify` | **YES** | `VendorVerificationController.verifyVendor` | `ADMIN_OBPARK`, `SUPER_ADMIN_OBPARK` | **DEFECT FOUND** — Requires `rejectionReason` when `status === 'REJECTED'`. Dev-3 frontend did not prompt for rejection reason. |
| **Vendor Fleet** | `POST /vendor/fleet/members` | **YES** | `VendorFleetController.linkMember` | `VENDOR` only | **DEFECT / CAPABILITY GAP** — VENDOR-only endpoint expecting `{ phoneNumber }`. Admin token receives 403 Forbidden. Backend lacks admin invitation proxy. |
| **Vendor Fleet** | `GET /vendor/fleet/surveillance` | **YES** | `VendorFleetController.getFleetSurveillance` | `VENDOR` only | **DEFECT FOUND** — Dev-3 called this with admin token. Admin session gets 403. Admin fleet roster is already available via `GET /admin/vendors/:id/details`. |
| **Settlements** | `GET /admin/crew/payouts/pending` | **YES** | `AdminCrewPayoutController.getPendingPayouts` | `ADMIN_OBCREW`, `SUPER_ADMIN_OBCREW` | **PASS** — Returns `{ total, crews: [...] }` with masked bank accounts. |
| **Settlements** | `POST /admin/crew/:id/mark-paid` | **YES** | `AdminCrewPayoutController.markCrewPaid` | `ADMIN_OBCREW`, `SUPER_ADMIN_OBCREW` | **DEFECT FOUND** — `periodStart` and `periodEnd` are required ISO strings; returns `payout.id` (frontend expected `payoutRecordId`). |
| **Settlements** | `GET /admin/crew/:id/payout-history` | **YES** | `AdminCrewPayoutController.getCrewPayoutHistory` | `ADMIN_OBCREW`, `SUPER_ADMIN_OBCREW` | **PASS** — Returns `{ crewProfile, total, totalPaid, payouts }`. |
| **Settlements** | `POST /vendor/wallet/admin/settle/:vendorProfileId` | **YES** | `VendorWalletController.settlePayout` | `ADMIN_OBPARK`, `SUPER_ADMIN_OBPARK` | **DEFECT FOUND** — Returns `payoutId` (frontend expected `payoutRecordId`). Requires OBPARK admin role. |
| **Settlements** | `GET /vendor/wallet/admin/pending` | **NO** | *None* | *None* | **BACKEND CAPABILITY GAP** — Endpoint does not exist in backend. Frontend must handle gracefully without crashing or faking. |
| **Settlements** | `GET /crew/wallet/ledger/all` | **NO** | *None* | *None* | **BACKEND CAPABILITY GAP** — Endpoint does not exist. Frontend previously swallowed 404 and returned empty array. |
| **Settlements** | `GET /admin/billing/summary` | **NO** | *None* | *None* | **BACKEND CAPABILITY GAP** — Endpoint does not exist (`BillingController` only handles customer addresses). |
| **Incidents** | `GET /admin/incidents` | **YES** | `QualityLoopController.listIncidents` | `ADMIN_*`, `SUPER_ADMIN_*` | **PASS** — Paginated list with status and type filters. |
| **Incidents** | `GET /admin/incidents/:id` | **YES** | `QualityLoopController.getIncidentById` | `ADMIN_*`, `SUPER_ADMIN_*` | **PASS** — Full incident detail. |
| **Incidents** | `POST /admin/incidents/:id/review` | **YES** | `QualityLoopController.reviewIncident` | `ADMIN_*`, `SUPER_ADMIN_*` | **PASS** — Transitions OPEN -> UNDER_REVIEW. |
| **Incidents** | `POST /admin/incidents/:id/resolve` | **YES** | `QualityLoopController.resolveIncident` | `ADMIN_*`, `SUPER_ADMIN_*` | **DEFECT FOUND** — Backend DTO only accepts `adminNotes`. Dev-4 frontend invented client-side `penaltyAmount` financial deduction. |
| **Incidents** | `POST /admin/incidents/:id/dismiss` | **YES** | `QualityLoopController.dismissIncident` | `ADMIN_*`, `SUPER_ADMIN_*` | **PASS** — Accepts `adminNotes`. Transitions OPEN/UNDER_REVIEW -> DISMISSED. |

---

## 4. Discovered Defects & Integration Action Plan

1. **Dual QueryClientProviders:**
   - Dev-3 added `QueryClientProvider` in `app/admin/layout.tsx`.
   - Dev-4 added `QueryProvider` in root `app/layout.tsx`.
   - *Fix:* Retain single root provider in `app/layout.tsx`; remove redundant provider in `app/admin/layout.tsx`.

2. **Unset `NEXT_PUBLIC_BACKEND_URL` Fallback:**
   - Dev-3 fetch calls used `process.env.NEXT_PUBLIC_BACKEND_URL` without default fallback, producing URL errors (`undefined/path`).
   - *Fix:* Unify all network calls through `lib/api/client.ts` with sanitized base URL fallback (`http://localhost:3001`).

3. **Vendor Roster Route Misuse:**
   - Dev-3 called `GET /vendor/fleet/surveillance` on admin pages, generating 403 Forbidden errors.
   - *Fix:* Use `GET /admin/vendors/:id/details`, which already returns `members` with `crewProfile` under admin authorization.

4. **Vendor Rejection Missing Reason:**
   - Backend `VerifyVendorDto` strictly requires `rejectionReason` (min 1, max 500 chars) on `REJECTED`.
   - *Fix:* Add rejection reason prompt/input in vendor management UI.

5. **Invented Penalty Deductions:**
   - Dev-4 modal provided a "Penalty Deducted" radio button with custom rupee input. The backend only accepts `adminNotes`.
   - *Fix:* Align UI with real backend contract (`adminNotes` capturing adjudication findings); eliminate fake financial transaction mutations.

6. **Crew Payout DTO Requirements:**
   - `periodStart` and `periodEnd` are non-optional ISO 8601 strings on `MarkCrewPaidDto`.
   - *Fix:* Provide valid defaults (start of current cycle / 30-day window, end date now) and validate before submitting.

7. **Settlement Response Field Mapping:**
   - Crew payout returns `{ payout: { id, amountPaid } }` instead of `{ payoutRecordId, amountSettled }`.
   - Vendor payout returns `{ payoutId, amountSettled }` instead of `{ payoutRecordId }`.
   - *Fix:* Normalize response payloads in API client/hooks.

8. **Missing Backend Endpoints Handling:**
   - `GET /vendor/wallet/admin/pending`, `GET /crew/wallet/ledger/all`, and `GET /admin/billing/summary` do not exist.
   - *Fix:* Document capability gaps, display clear UI banner/status explaining that the backend endpoints are pending implementation, and prevent silent failures.

9. **Incident Page Component Wiring:**
   - Dev-4 created `components/incidents/IncidentsDesk.tsx` but left `app/admin/incidents/page.tsx` displaying hardcoded mock cards.
   - *Fix:* Connect `IncidentsDesk` to `app/admin/incidents/page.tsx`.

10. **Role & Authorization Segregation:**
    - Crew payouts require `ADMIN_OBCREW` or `SUPER_ADMIN_OBCREW`.
    - Vendor settlements and vendor verifications require `ADMIN_OBPARK` or `SUPER_ADMIN_OBPARK`.
    - *Fix:* Ensure UI reflects distinct platform role requirements rather than treating all admins identically.
