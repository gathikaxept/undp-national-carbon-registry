# E2E Test Coverage Audit

**Scope**: the Playwright suite under `tests/e2e/article6/` — the only E2E tests in the repo. A legacy `tests/e2e-test.spec.ts` smoke file referenced in earlier planning documents is no longer present.

**Date of audit**: 2026-04-24.

**2026-04-24 gap-fill in progress** — see sub-agent progress below. Factories added in `tests/e2e/article6/support/factories.ts` (createProgramme, authorizeProgramme, issueCredits, initiateTransfer, performRetireAction).

**Totals**: 7 spec files, 4,430 LoC, **129 active tests**, 4 `test.fixme`, 1 `test.skip`.

---

## 1. Test file inventory

| File | LoC | Tests | Happy path | Edge case | Notes |
|---|---:|---:|---:|---:|---|
| `cooperative-approach.spec.ts` | 358 | 14 | 8 | 6 | CRUD + UI + PD-readonly CASL. No Revoked, no invalid transitions. |
| `itmo-lifecycle.spec.ts` | 620 | 14 | 7 | 7 | Heavy on enum shape + UI filter smoke; real issuance path behind `fixme`. |
| `omge-sop-deductions.spec.ts` | 470 | 16 | 9 | 7 | Strong arithmetic suite; 3 fixmes for env-var + `/issueCredits` dependencies. |
| `aef-reporting.spec.ts` | 507 | 18 | 10 | 8 | Query + download round-trips + enum shape + CASL; no row-content assertions on populated data. |
| `corresponding-adjustment.spec.ts` | 670 | 24 | 13 | 11 | Most comprehensive file; exercises the para 8 formula with several edge scenarios. |
| `initial-report.spec.ts` | 731 | 23 | 11 | 12 | Pre-population, update merge, submit idempotency, 409 duplicate. One `.skip`. |
| `cross-cutting.spec.ts` | 1074 | 20 | 6 | 14 | Flagship E2E, CASL matrix, sequencing invariants, immutability, drift behavior. |
| **Total** | **4430** | **129** | **64** | **65** | — |

Happy vs edge classified by test title and assertion depth: a test that asserts only `statusCode=200` is "happy path"; a test that asserts a specific error code, rejection reason, state transition guard, or formula value is "edge case".

---

## 2. Coverage matrix

Legend: ✅ covered · ⚠ partial · ❌ not covered

### Auth & navigation

| Flow | Status | Citation | Note |
|---|---|---|---|
| Login as DNA Admin | ✅ | auth fixtures (all specs) | `storageState` via `createApiClient`. |
| Login as PD Admin | ✅ | `cooperative-approach.spec.ts:328` | Read-only permission path only. |
| Login as IC Admin | ✅ | `aef-reporting.spec.ts:422` | Denial path only. |
| Login as Ministry Admin | ✅ | `cross-cutting.spec.ts:496` | CASL mirror-of-DNA. |
| Login as DNA ViewOnly | ✅ | `cross-cutting.spec.ts:528` | One test only; non-exhaustive. |
| Login with bad credentials | ❌ | — | No test returns 401 assertion. |
| Logout | ❌ | — | No flow exists in suite. |
| Session expiry / token refresh | ❌ | — | No coverage. |
| Password reset | ❌ | — | Absent. |
| Role-based sidebar visibility | ❌ | — | The UI test files click into pages but never assert menu items. |

### Cooperative Approach lifecycle

| Flow | Status | Citation | Note |
|---|---|---|---|
| Create (minimal) | ✅ | `cooperative-approach.spec.ts:36` | Happy path. |
| Create w/ missing `participatingParties` | ✅ | `:58` | Validation 400. |
| GET by id — found | ✅ | `:76` | |
| GET by id — 404 | ✅ | `:93` | |
| Query paginated | ✅ | `:100` | |
| Update title/description | ✅ | `:115` | |
| Update non-existent | ✅ | `:143` | 404. |
| Draft → Active → Suspended → Completed | ✅ | `:156` | Linear path only. |
| Draft → Revoked | ✅ | `cooperative-approach.spec.ts:189` | Gap #11. Direct happy-path transition from freshly-created Draft CA. |
| Suspended → Revoked | ✅ | `cooperative-approach.spec.ts:217` | Gap #11. Draft → Active → Suspended → Revoked chain; verifies persistence via GET. |
| Active → Completed (skipping Suspended) | ✅ | `cooperative-approach.spec.ts:249` | Gap #12. Locks non-linear happy path; CA lifecycle spec does not require Suspended as an intermediate. |
| Completed → Active (invalid transition) | ✅ | `cooperative-approach.spec.ts:282` | Gap #5. State machine in cooperative-approach.service rejects transitions out of terminal states (Completed, Revoked) and any transition back to Draft with a 400. Persisted status remains Completed after the rejected update. |
| Revoked CA blocks new ITMO authorization | ✅ | `cross-cutting.spec.ts:677` | The only place Revoked is exercised at all. |
| PD cannot create | ✅ | `cooperative-approach.spec.ts:344` | 403. |
| PD list read | ✅ | `:328` | UI-level. |
| Concurrent update conflicts | ❌ | — | No optimistic-locking test. |
| UI add-new flow | ✅ | `:203` | Full form fill + list-appearance. |
| UI status change via dropdown | ✅ | `:278` | Draft → Active only. |

### Initial Report

| Flow | Status | Citation | Note |
|---|---|---|---|
| Generate with minimal input | ✅ | `initial-report.spec.ts:68` | |
| Pre-population from CA | ✅ | `:96` | Title, metric, countryCode. |
| Generate with explicit overrides | ✅ | `:156` | |
| Generate for missing CA | ✅ | `:218` | 400. |
| Duplicate generate for same CA (one-IR-per-CA) | ✅ | `:233` + `cross-cutting:793` | 409. |
| Partial update merge | ✅ | `:259` | |
| Update nonexistent | ✅ | `:309` | 404. |
| Update on Published IR | ✅ | `:321` | 400. |
| **Update on Submitted (non-Published) IR** | ❌ | — | Only Published is tested as immutable; Submitted immutability is undefined and untested. |
| Submit fully populated | ✅ | `:348` | |
| Submit with nulled required field | ⚠ | `:364` | Ends in `test.skip` at line 388 because the update DTO rejects nulls before a null can reach submit. |
| Submit nonexistent | ✅ | `:407` | |
| Submit idempotency | ✅ | `:418` | |
| `/check` before submit | ✅ | `:460` | |
| `/check` after submit | ✅ | `:479` | |
| `/check` transitions across every status | ✅ | `cross-cutting:565` | Pre-IR / Draft / Submitted. |
| `/check` reachable by any auth'd role | ✅ | `:458`, `cross-cutting:458` | JwtAuthGuard only. |
| PD cannot generate | ✅ | `:593` | 403. |
| IR status preserved across re-read | ✅ | `cross-cutting:851` | Draft-then-Submitted. |
| CA title change does NOT propagate to generated IR | ✅ | `cross-cutting:754` | Snapshot drift behaviour documented. |
| **IR of a Revoked CA — what happens?** | ❌ | — | Neither `/generate` nor `/submit` has a Revoked-CA guard test. |

### Programme / project lifecycle

| Flow | Status | Citation | Note |
|---|---|---|---|
| Create programme (full DTO) | ✅ | `programme-lifecycle.spec.ts:69` | **Gap #19 executable path.** Real ProgrammeDto roundtrip: CA -> /programme/create -> /programme/getHistory readback. Locks every required ProgrammeDto field end-to-end. |
| Create programme -> authorize -> Authorised visible in query view | 🔧 | `programme-lifecycle.spec.ts:121` | **Gap #19 flagship (fixme).** Blocked on the AWAITING_AUTHORIZATION -> APPROVED transition (requires METHODOLOGY_DOCUMENT /docAction; no factory today) and the ledger-replicator being up (so /programme/query can read the final state). |
| Authorize immediately after create returns 400 | ✅ | `programme-lifecycle.spec.ts:174` | State-machine guard: programme.service.ts:6474 rejects anything not in APPROVED. Lifts the stage-gate contract end-to-end through the real create DTO. |
| Review / approve / reject lifecycle | ⚠ | `programme-lifecycle.spec.ts:174` | Approve-methodology leg still missing; reject is untested. |
| Authorize **without** submitted IR (para 18 gate) | ✅ | `cross-cutting:616` | Returns 400 citing the clause. |
| Authorize **with** submitted IR | ✅ | `cross-cutting:644` | Gate passes. |
| Authorize under a Revoked CA | ✅ | `cross-cutting:677` | Rejected per Draft -/CMA.5 ¶21. |
| Authorize under a **Suspended** CA | ✅ | `programme-lifecycle.spec.ts:209` | Gap #17. Authorize is blocked while the CA is paused; `programme.service.ts:6435` now rejects REVOKED and SUSPENDED with a status-interpolated 400 citing Draft -/CMA.5 ¶¶ 20-21. |
| Authorize twice (idempotency) | ❌ | — | |
| Revoke authorization | ❌ | — | If the service supports it, no test. |

### Credit issuance

| Flow | Status | Citation | Note |
|---|---|---|---|
| Issue credits to an authorised programme | ✅ | `credit-issuance.spec.ts:58` | **Gap #1 — now covered.** Real /programme/issue exercised via `seedProgrammeDirect` (Authorised) + `seedVerifiedMitigationActionDirect` (appends a MitigationProperties row with a VERIFICATION_REPORT URL onto the ledger `programmes.data` JSONB). Guard companions at `:118` and `:163` cover AUTHORISED-state + ghost-actionId gates. |
| Issue with OMGE/SOP auto-deduct ON | ⚠ | `omge-sop-deductions.spec.ts:102` | Unit-level arithmetic only (`calculateDeductions` function, not the issuance service). |
| Issue with auto-deduct OFF | ⚠ | `:111` + `:321 fixme` | Arithmetic tested; env-var flip not testable (see Infrastructure gaps). |
| Issue to programme with no CA | ✅ | `credit-issuance.spec.ts:199` | **Gap #20 — now covered.** `issueProgrammeCredit` now carries a symmetric `article6trade && !cooperativeApproachId` guard (programme.service.ts) that mirrors the /authorize gate at 6415-6421 and rejects with 400 citing Dec 2/CMA.3 Annex para 18. |
| Issue negative / zero / very large | ⚠ | `:133`, `:140`, `:152` | Arithmetic only. |
| Structured 5-component ITMO serial | ✅ | `cross-cutting:992`, `credit-issuance.spec.ts:238` | Asserted on a seeded block at cross-cutting; a real-issuance smoke at credit-issuance drives the same flow end-to-end. |
| Issue to non-authorised programme is rejected | ✅ | `credit-issuance.spec.ts:118` | Locks AUTHORISED-state gate (programme.service.ts:5819-5827). |
| Issue with ghost actionId is rejected | ✅ | `credit-issuance.spec.ts:163` | Locks the verified-mitigation-action gate. |

### Credit transfers (domestic)

| Flow | Status | Citation | Note |
|---|---|---|---|
| Initiate transfer | ✅ | `credit-transfer.spec.ts:72` | **Gap #2 (synchronous branch).** PD-to-PD transfer via POST /transfer; asserts 200 and response body echoes `amount`, `fromCompanyId`, `toCompanyId`. Seeds RDBMS + ledger rows via new `seedTransferrableBlock` factory. |
| Approve pending transfer (ownership flip) | 🔧 | `credit-transfer.spec.ts:271` | Fixme: no `/creditTransactionsManagement/approve` route exists — the transfer service finalises ownership at initiate time (credit-transactions-management.service.ts:148). Approve/Reject/Cancel state machine is not exposed. |
| Reject pending transfer | 🔧 | `credit-transfer.spec.ts:308` | Fixme: same blocker as Approve — no `/reject` route. |
| Cancel own pending transfer | ❌ | — | No `/cancel` route; sender has no rollback path once the synchronous transfer has committed. |
| Partial transfer (split block) | ❌ | — | |
| Transfer-to-self | ✅ | `credit-transfer.spec.ts:226` | **Gap #8 Major — now covered.** Service rejects with 400 when `user.companyId === receiverOrgId`. |
| Transfer more than owned (overdraw) | ✅ | `credit-transfer.spec.ts:171` | **Gap #7 Major.** Service guard at credit-transactions-management.service.ts:136-147 returns 400 "notEnoughCreditAmount"; test additionally verifies balance unchanged via queryBalance. |
| queryTransfers visibility round-trip | 🔧 | `credit-transfer.spec.ts:116` | Fixme: credit_transactions_entity is populated by the ledger-replicator container, which is optional in the dev stack and Exited in local development. |
| UI: Transfer action button from Credit Balance | ❌ | — | |

### Credit transfers (international / first)

| Flow | Status | Citation | Note |
|---|---|---|---|
| First-transfer tagging via replicator pre-vs-post state | ✅ | `itmo-lifecycle.spec.ts:395` | Verifies `isFirstTransfer=true` on first outgoing, false after. |
| Query returns `isFirstTransfer` + AccountType fields | ✅ | `:322` | Shape only. |
| First transfer under Revoked CA (blocked at authorize layer) | ✅ | `cross-cutting:677` | Reuses authorize guard. |
| First transfer under Revoked CA at **service** layer (`/transfer`) | ✅ | `cross-cutting:1128` | **Gap #3 Critical — now covered.** Service rejects first-transfer with 400 citing Draft -/CMA.5 ¶21 when the block's linked CA has status REVOKED. Ledger block balance untouched. |
| **AEF Actions row content after first transfer** | ❌ | — | The doc claims row-content assertions; enumeration finds shape-only tests. |
| **Acquisition (inbound)** | ❌ | — | No service produces `ACQUIRED` rows; no test covers the flow, which is a known registry gap. |
| Transfer from a fully-transferred block | ❌ | — | Overdraw case. |

### Retirement

| Flow | Status | Citation | Note |
|---|---|---|---|
| Retirement modal exposes all 6 types | ✅ | `itmo-lifecycle.spec.ts:189` | Bundle-scan smoke. |
| Each type lands in correct `AccountType` | ✅ | `retirement.spec.ts:115` | Parameterized over all 6 `CreditRetirementType` values; seeds ledger + RDBMS, runs phase 1 + phase 2, reads back the derived retirement block via ledger SQL. |
| `CreditRetirementTypeEnum` has 6 values | ✅ | `:582` | Enum cardinality only. |
| PD `/performRetireAction` with ACCEPT rejected | ✅ | `:599` | CASL. |
| Retire full balance | ✅ | `retirement.spec.ts:243` | Covered as the first half of the already-retired regression — 100/100 reserved, then the follow-up second retire must 400. |
| Retire more than balance (overdraw) | ✅ | `retirement.spec.ts:188` | Gap #6. 500 against 100 → 400; asserts no mutation to ledger reservedCreditAmount. |
| Retire from an already-retired block | ✅ | `retirement.spec.ts:231` | Gap #9. Second retire of 1 credit after full-balance retire → 400 via ledger guard at programme-ledger.service.ts:710-721. |
| Retirement type → AccountType mapping | ✅ | `retirement.spec.ts:115` | Gap #10. 6-way parameterized mapping locked against `mapRetirementTypeToAccountType` at programme-ledger.service.ts:56-78. |

### Corresponding Adjustment

| Flow | Status | Citation | Note |
|---|---|---|---|
| Calculate returns CA-ADJ-<n> + Draft status | ✅ | `corresponding-adjustment.spec.ts:95` | |
| Formula: `firstTransferred - acquired + usedTowardsNDC` | ✅ | `:127` | Dec 2/CMA.3 ¶8. |
| All 3 `CaMethod` values accepted | ✅ | `:157` | Shape-level. |
| Both `NdcType` values accepted | ✅ | `:177` | Shape-level. |
| Empty year (zero everything) | ✅ | `:196` | |
| Safeguard default pass when no emissions | ✅ | `:220` | |
| Safeguard fail path | ✅ | `:258` | |
| CA scoping (no cross-contamination) | ✅ | `:288` | |
| Invalid `ndcType` (validator) | ✅ | `:316` | |
| Missing `year` (validator) | ✅ | `:332` | |
| Query paginated | ✅ | `:350` | |
| GET by id — found + 404 | ✅ | `:384`, `:407` | |
| Submit Draft → Submitted | ✅ | `:416` | |
| Submit already-Submitted is idempotent | ✅ | `:443` | |
| Submit nonexistent | ✅ | `:484` | 404. |
| Two calcs for same (CA, year) produce distinct IDs | ✅ | `cross-cutting:816` | No-idempotency invariant. |
| **Year with only acquisitions (no first-transfers)** | ❌ | — | Negative-emissionsBalance case unexercised. |
| **Year with more acquisitions than transfers** | ❌ | — | Sign-flip safety. |
| **Submit a CA-ADJ that has gone stale** (txns added after calc) | ❌ | — | Does the system recalc or use snapshot? Untested. |
| PD cannot calculate / query | ✅ | `:531`, `:549` | |
| UI list / form / results | ✅ | `:568`, `:586`, `:614` | |

### AEF reporting

| Flow | Status | Citation | Note |
|---|---|---|---|
| Query returns paginated envelope w/ Phase 4 columns | ✅ | `aef-reporting.spec.ts:117` | |
| Download HOLDINGS × CSV | ✅ | `:186` | File ref or 400. |
| Download ACTIONS × CSV | ✅ | `:206` | |
| Download ANNUAL_INFORMATION × CSV | ✅ | `:220` | |
| Download HOLDINGS × XLSX | ✅ | `:236` | |
| HOLDINGS filter = authorization only | ✅ | `:250` | |
| ACTIONS filter shows multiple types | ✅ | `:292` | |
| Invalid reportType | ✅ | `:336` | 400/422. |
| Invalid fileType | ✅ | `:351` | |
| Enum cardinality (Action/ReportType/FileType) | ✅ | `:369`, `:385`, `:392` | |
| PD cannot download | ✅ | `:409` | |
| IC cannot download | ✅ | `:422` | |
| PD cannot query | ✅ | `:433` | |
| UI /reports renders | ✅ | `:457` | |
| UI export buttons exist | ✅ | `:470` | |
| UI year picker + multi-select | ✅ | `:490` | |
| **Row content**: `cooperativeApproachId`, `authorizationPurpose`, `isFirstTransfer`, `acquiringPartyCountryCode`, `reportingYear` | ❌ | — | Documented as covered; actual assertions are shape-only on empty or single-row data. |
| Empty year (nothingToExport) | ✅ | `:186` (merged with happy path) | |
| Cumulative-amount monotonicity | ❌ | — | Annual report invariant. |

### Admin / config

| Flow | Status | Citation | Note |
|---|---|---|---|
| GET /admin/deductionConfig as DNA | ✅ | `omge-sop-deductions.spec.ts:212` | |
| GET /admin/deductionConfig as PD | ✅ | `:233` | 403. |
| ItmoAccount query | ✅ | `itmo-lifecycle.spec.ts:513` | |
| ItmoAccount query as PD | ✅ | `:542` | 403. |
| ItmoAccount by-company | ❌ | — | `/byCompany` route exists (controller line 43); no test. |

### CASL matrix

| Role | Status | Citation |
|---|---|---|
| DNA Admin | ✅ | `cross-cutting.spec.ts:269` |
| PD Admin | ✅ | `:316` |
| IC Admin | ✅ | `:386` |
| Ministry Admin | ✅ | `:496` |
| DNA ViewOnly | ✅ | `:528` (single test) |

Features in matrix: CA, IR, CA-ADJ, AEF. **Missing**: CreditTransfer, Programme/Project, Retirement, User/Company — none of those go through the matrix test.

### Cross-cutting invariants

| Invariant | Status | Citation | Note |
|---|---|---|---|
| Full E2E happy path (CA → IR → authorize → calc → AEF) | ✅ | `cross-cutting:115` | The lynchpin test. |
| Sequencing: para 18 IR-before-authorize | ✅ | `:616`, `:644` | |
| Sequencing: Revoked CA blocks authorize | ✅ | `:677` | |
| Sequencing: cannot issue before authorize | ✅ | `credit-issuance.spec.ts:118` | AUTHORISED-state gate. |
| Sequencing: cannot transfer before issue | ❌ | — | |
| Sequencing: cannot retire before issue | ❌ | — | |
| `cooperativeApproachId` immutable via /update | ✅ | `:895` | |
| `reportId` stable across lifecycle | ✅ | `:952` | |
| Structured ITMO serial present on block | ✅ | `:992` | Presence; not immutability through retire/split. |
| **Serial immutability through retire/split** | ✅ | `cross-cutting:1200` | Service now propagates itmoSerial onto both split children via sub-range derivation. |
| **No double-counting across CAs in a year** | ❌ | — | Mentioned in the coverage plan; no implementing test. |

### User / company / documents

| Flow | Status | Citation | Note |
|---|---|---|---|
| Create / update company | ❌ | — | |
| Create / invite user | ❌ | — | |
| User w/ multiple roles | ❌ | — | |
| Deactivate user | ❌ | — | |
| Upload / version a project document (PDD / VR) | ❌ | — | |
| i18n language switch | ❌ | — | |

---

## 3. Edge-case gaps (priority-ordered)

### Critical (compliance-affecting or bug-hiding for demo-blocking flows)

1. **Flow**: Credit issuance end-to-end. **Status**: ✅ covered (`credit-issuance.spec.ts:58`). Executable guard companions at `:118` (non-AUTHORISED programme rejected), `:163` (ghost actionId rejected), `:199` (no-CA guard), `:215` (structured-serial smoke).
   **Edge case**: issuing N credits to an authorised programme under a CA-linked programme drives the `/programme/issue` service to return `issuedAmount=N` without any deduction or mitigation-action contract violation.
   **Why it matters**: the entire OMGE/SOP deduction suite previously asserted arithmetic on a pure function; this test anchors the service at the HTTP boundary, covering the verified-mitigation-action gate (`isVerfiedMitigationAction`, programme.service.ts:6040) and the issuance-side CA presence guard.
   **Severity**: Critical (now closed).
   **Unblocked by**: (a) `seedVerifiedMitigationActionDirect` in `tests/e2e/article6/support/factories.ts` — appends a MitigationProperties row onto the ledger `programmes.data` JSONB with a `VERIFICATION_REPORT` URL in `projectMaterial`, no replicator or HTTP addDocument refactor required; (b) the new `article6trade && !cooperativeApproachId` guard on `issueProgrammeCredit`.

2. **Flow**: Domestic credit transfer initiate → approve. **Status**: ⚠ partial (`credit-transfer.spec.ts:72`). Initiate happy path + overdraw guard covered; queryTransfers visibility and approve/reject/cancel legs behind `.fixme` at `:116`, `:271`, `:308`.
   **Edge case**: a sender initiates 50k of 200k; recipient approves; sender's block drops to 150k, recipient has a new 50k block with the same `projectRefId`, and a `CreditTransactionsEntity` row is written with `type=Transfered`.
   **Why it matters**: the entire inter-company transfer flow is untested; a CASL regression or split-block bug ships to production with no automated catch.
   **Severity**: Critical.
   **Suggested test**: seed a PD-owned block; simulate PD → PD transfer via `POST /creditTransactionsManagement/transfer` and `/approve`.
   **Blocker (approve/reject/cancel)**: no `/creditTransactionsManagement/approve|reject|cancel` routes exist (controller exposes only transfer, retireRequest, performRetireAction, queryBalance, queryTransfers, queryRetirements). The synchronous transfer flow commits ownership at initiate time; there is no pending-state state machine to drive. Unfix the approve/reject tests once such a two-phase flow lands.
   **Blocker (queryTransfers visibility)**: credit_transactions_entity is populated by the ledger-replicator container. When the container is stopped in local dev the assertion times out at 15s; test is `.fixme` until the replicator joins the required test-stack set.

3. **Flow**: First outbound transfer under a Revoked CA. **Status**: ✅ covered (`cross-cutting.spec.ts:1128`).
   **Edge case**: attempt to first-transfer credits from a block whose programme's CA was Revoked after the block was issued.
   **Why it matters**: Draft -/CMA.5 ¶21 requires this to be blocked. The authorize-layer guard (cross-cutting:677) is now mirrored at the `/transfer` service layer.
   **Severity**: Critical.
   **Suggested test**: create CA + submitted IR + transferrable block, flip CA to Revoked via `PUT /cooperativeApproach/update`, then POST `/creditTransactionsManagement/transfer` and assert 400. Service rejects with 400 citing ¶21; ledger block balance unchanged.

4. **Flow**: Inbound acquisition.
   **Edge case**: simulate a foreign-issued ITMO arriving at this registry with a preserved foreign serial.
   **Why it matters**: completely absent — enums `ACQUIRED` / `ACQUISITION` exist but no service writes them, no test exercises them. Acquiring-side TER submissions would fail.
   **Severity**: Critical (implementation gap becomes a test gap).
   **Suggested test**: call the acquisition endpoint once it exists; assert `CreditTransactionsEntity.type=Acquired`, AEF `actionType=acquisition`, and foreign serial preservation.

5. **Flow**: Cooperative Approach invalid transition guard. **Status**: ✅ covered (`cooperative-approach.spec.ts:282`).
   **Edge case**: Completed → Active via `PUT /update` rejected with 400; persisted status remains Completed.
   **Why it matters**: Completed is a terminal state; un-completing a CA would let a Party resurrect a wound-down arrangement and issue new ITMOs.
   **Severity**: Critical.
   **Suggested test**: create CA, transition to Completed, attempt update with `status=Active`, assert 400. State machine in cooperative-approach.service enforces Completed and Revoked as terminal and forbids any transition back to Draft.

### Major (non-obvious correctness or defence-in-depth)

6. **Flow**: Retirement overdraw. **Status**: ✅ covered (`retirement.spec.ts:188`).
   **Edge case**: retire 500 from a block with 100 balance.
   **Why it matters**: silent underflow could produce negative balances in the ledger.
   **Severity**: Major.
   **Suggested test**: seed 100; `retireRequest` with `amount=500`; assert 400 and no change to ledger block balance. Locks the guard at programme-ledger.service.ts:710-721 (ledger) and credit-transactions-management.service.ts:230-241 (RDBMS).

7. **Flow**: Transfer overdraw (international + domestic). **Status**: ✅ covered (`credit-transfer.spec.ts:171`).
   **Edge case**: initiate transfer of 5000 from a block with 3000 remaining.
   **Severity**: Major.
   **Suggested test**: mirror of (6).

8. **Flow**: Transfer-to-self. **Status**: ✅ covered (`credit-transfer.spec.ts:226`).
   **Edge case**: sender organization equals recipient organization.
   **Severity**: Major.
   **Suggested test**: assert 400. Service now rejects when `user.companyId === receiverOrgId`.

9. **Flow**: Retirement from a fully retired block. **Status**: ✅ covered (`retirement.spec.ts:231`).
   **Edge case**: second `retireRequest` on a block whose full balance is already reserved for retirement.
   **Severity**: Major.
   **Suggested test**: retire full balance, retry with amount=1, assert 400 via the ledger spendable-credits check.

10. **Flow**: Retirement type → AccountType mapping. **Status**: ✅ covered (`retirement.spec.ts:115`).
    **Edge case**: each of 6 `CreditRetirementType` enum values produces the corresponding `AccountType` on the derived retirement block.
    **Why it matters**: the `mapRetirementTypeToAccountType` function is untested; a one-line regression would silently lump "Use Towards NDC" into the wrong account and break AEF routing.
    **Severity**: Major.
    **Suggested test**: parameterized 6-way — phase 1 retireRequest + phase 2 performRetireAction ACCEPT for each type; assert the split retirement block in the ledger carries the mapped accountType. Covers programme-ledger.service.ts:56-78 (including the CROSS_BORDER_TRANSACTIONS → Holding fall-through).
    **Test-infra note**: the ledger-replicator container is Exited locally, so the phase-2 ACCEPT reads `credit_transactions_entity` via a direct SQL insert (`seedPendingRetirementTransactionDirect`). Once the replicator is back in the test stack this seed becomes unnecessary.

11. **Flow**: CA Revoked transitions from each prior state. **Status**: ⚠ partial — Draft → Revoked ✅ (`cooperative-approach.spec.ts:189`), Suspended → Revoked ✅ (`:217`); Active → Revoked still only covered indirectly via the authorize gate at `cross-cutting:677`, not as a transition-only assertion.
    **Edge case**: Draft → Revoked, Active → Revoked (already covered via authorize gate but not the transition itself), Suspended → Revoked.
    **Severity**: Major.
    **Suggested test**: remaining leg is a dedicated Active → Revoked transition-persistence test (no authorize); the other two paths are locked.

12. **Flow**: CA state non-linear transitions. **Status**: ⚠ partial — Active → Completed (skipping Suspended) ✅ (`cooperative-approach.spec.ts:249`); Suspended → Active reactivation ❌ still untested.
    **Edge case**: Active → Completed (skipping Suspended), Suspended → Active (reactivation).
    **Severity**: Major.
    **Suggested test**: add a Suspended → Active reactivation test; registry currently permits it since there is no state machine, so locking the accepted behaviour (or, if spec requires, a 400 guard) is the remaining work.

13. **Flow**: IR submitted-but-not-published immutability.
    **Edge case**: `PUT /update` on a Submitted IR.
    **Why it matters**: the Published-lock test exists (line 321); Submitted's lock status is undefined. A compliant registry should probably lock both.
    **Severity**: Major.
    **Suggested test**: submit, then attempt update of a section; assert rejection or accept with guard around which fields are mutable.

14. **Flow**: Duplicate CA-ADJ calculations and downstream staleness.
    **Edge case**: calc CA-ADJ for (CA, 2025) on day 1, submit; then add more transactions; re-calc is allowed (tested at cross-cutting:816) but what does the Submitted one contain?
    **Why it matters**: if the submitted CA-ADJ snapshot is derived at calc time, later transactions are invisible (OK). If it derives at submit time, it double-counts. Behaviour is undefined-in-tests.
    **Severity**: Major.
    **Suggested test**: lock current behaviour either way.

15. **Flow**: AEF row content correctness.
    **Edge case**: after a programme lifecycle (CA + IR + issue + first-transfer + retire), assert each AEF row carries the expected `cooperativeApproachId`, `authorizationPurpose`, `isFirstTransfer`, `acquiringPartyCountryCode`, `reportingYear`.
    **Why it matters**: the AEF tests verify download shape, not row content. A mis-wired reducer in `aef-report-management.service.ts` would ship silently.
    **Severity**: Major.
    **Suggested test**: seed fixture → trigger replicator → assert each field per row.

16. **Flow**: `cumulativeAmount` monotonicity in Annual Information.
    **Edge case**: transactions across 2024/2025/2026 → cumulative column never decreases.
    **Severity**: Major.
    **Suggested test**: seed 3 years of data; download ANNUAL_INFORMATION; assert sorted-ascending.

17. **Flow**: Suspended-CA authorize gate. **Status**: ✅ covered (`programme-lifecycle.spec.ts:209`).
    **Edge case**: attempt to authorize a programme under a Suspended CA.
    **Why it matters**: Suspended is a temporary pause; new authorizations must be blocked until reactivation. `programme.service.ts:6435` now rejects REVOKED and SUSPENDED with a status-interpolated 400 citing Draft -/CMA.5 ¶¶ 20-21.
    **Severity**: Major.
    **Blocker**: `authorizeProgramme` at programme.service.ts:6435 only rejects `CooperativeApproachStatus.REVOKED`. Add a symmetric check for `SUSPENDED` (and optionally `COMPLETED` / `DRAFT`) with a message citing the clause, then unfix this test.

18. **Flow**: Serial-number immutability through split + retire. **Status**: ✅ covered (`cross-cutting.spec.ts:1193`).
    **Edge case**: transfer half of a block, retire the other half, assert both derived blocks carry serials derivable from the original `itmoSerial`.
    **Why it matters**: Draft -/CMA.5 ¶132 immutability. Only a snapshot test (at cross-cutting:999) covers presence; this test covers lineage through operations.
    **Severity**: Major.
    **Suggested test**: seed 1000-credit block with known structured itmoSerial, transfer 400 to split, retire 200 from the sender-retained child, assert every derived ledger block carries an `itmoSerial` that parses as a sub-range of the parent (matching `party`, `type`, `vintage`, `activityId`; `[start,end]` inside the parent's). `transferCreditAmountFromBlocks` (credit-blocks-management.service.ts) now derives itmoSerial sub-ranges onto both the retained parent and the transferred child; retirement (programme-ledger.service.ts:936) was already propagating itmoSerial.

19. **Flow**: Programme-create → authorize roundtrip. **Status**: ⚠ partial — create leg ✅ at `programme-lifecycle.spec.ts:69`; state-machine pre-Approved guard ✅ at `:174`; full authorize roundtrip 🔧 fixme at `:121`.
    **Edge case**: create programme via `/programme/create` (not SQL seed), link CA, submit IR, authorize, assert programme visible with `currentStage=Authorised` via the query view.
    **Why it matters**: the real create DTO has ~20 required fields; a DTO regression breaks the UI with no test. The create leg now exercises every field (designDocument, geographicalLocation, proponentTaxVatId, startTime/endTime) and reads back via the ledger's `/getHistory`.
    **Severity**: Major.
    **Suggested test**: full create flow; assert programme reachable via query; authorize; assert `currentStage=Authorised`.
    **Remaining blockers**: (a) /programme/authorize demands currentStage=APPROVED (programme.service.ts:6474), which requires a METHODOLOGY_DOCUMENT /docAction upload to transition out of AWAITING_AUTHORIZATION (programme.service.ts:1166-1184). No factory exists for that upload path. (b) /programme/query reads from the replicator-maintained RDBMS view; the ledger-replicator container is Exited locally, so a query-view readback of a freshly-created programme would not surface it. Both blockers are tracked in the spec's file-level docstring.

20. **Flow**: Issuance with no CA. **Status**: ✅ covered (`credit-issuance.spec.ts:199`).
    **Edge case**: issue credits to an authorised programme whose CA was since deleted or set to null.
    **Severity**: Major (now closed).
    **Fix**: `issueProgrammeCredit` (programme.service.ts) now rejects with 400 when `article6trade && !cooperativeApproachId`, citing Dec 2/CMA.3 Annex para 18 — same language as the symmetric /authorize guard at 6415-6421.

### Minor (polish, CASL coverage completeness, or UI smoke)

21. **Flow**: CASL matrix for CreditTransfer.
    **Edge case**: PD of Company A attempting to initiate a transfer from Company B's block.
    **Severity**: Minor (but a genuine CASL gap).
    **Suggested test**: assert 403 from PD-B session.

22. **Flow**: CASL matrix for Retirement.
    **Edge case**: PD retiring another PD's credits.
    **Severity**: Minor.

23. **Flow**: ItmoAccount `/byCompany`.
    **Edge case**: route returns only the caller's company when `companyId` query param absent; returns any company when DNA provides it.
    **Severity**: Minor.

24. **Flow**: DNA ViewOnly coverage depth.
    **Edge case**: only one test exists (cross-cutting:528); should cover Read on every resource, denial of every Create/Update.
    **Severity**: Minor.

25. **Flow**: Bad credentials login.
    **Edge case**: `POST /auth/login` with wrong password returns 401 (not 500).
    **Severity**: Minor.

26. **Flow**: Logout and session expiry.
    **Edge case**: call protected endpoint with an expired token.
    **Severity**: Minor.

27. **Flow**: Role-based sidebar visibility.
    **Edge case**: PD sees Programmes, doesn't see AEF Reports.
    **Severity**: Minor.

28. **Flow**: UI transfer action from Credit Balance.
    **Edge case**: click Transfer on a balance row, fill modal, submit; assert pending transfer in Transfers tab.
    **Severity**: Minor.

29. **Flow**: i18n language switch.
    **Edge case**: switch to a non-English locale; assert the projectProposalStage Tag renders the localised label.
    **Severity**: Minor.

30. **Flow**: Empty programmes list rendering.
    **Edge case**: navigate to /programmeManagement/viewAll with zero rows; page shows the empty state, not a crash.
    **Severity**: Minor (the recent view-column bug was exactly this kind of miss).

---

## 4. Tests that look weak

| Test | File:line | Weakness | Suggestion |
|---|---|---|---|
| `queryBalance accepts accountType filter` | `itmo-lifecycle.spec.ts:240` | Asserts the request returns 200, not that the filter actually restricts rows. | Seed blocks across two account types; assert filter returns only the matching set. |
| `queryBalance tolerates Phase 2 columns` | `:276`, `:322` | Shape tolerance only (extra columns don't crash). Doesn't exercise semantics. | Assert a specific row's `cooperativeApproachId` matches what was seeded. |
| `/reports exposes Export buttons` | `aef-reporting.spec.ts:470` | Visibility assertion only. | Click the button; assert download trigger. |
| `/reports has a year picker and a report-type multi-select` | `:490` | Control existence check. | Fill controls; submit; assert selection reaches the backend. |
| `default config mirrors configuration.ts` | `omge-sop-deductions.spec.ts:206` | Tests a default-export of a module; doesn't exercise the runtime read path. | Keep the API test (`:212`) as the primary assertion; this one is redundant. |
| `UI retirement modal: bundle-scan smoke` | `itmo-lifecycle.spec.ts:189` | Greps the shipped JS bundle for 6 strings. Doesn't open the modal. | Open the modal in a real session; assert 6 Radios visible. |
| `AEF enum cardinality` | `aef-reporting.spec.ts:369` | Locks the TS enum shape, not runtime behaviour. | Useful as a canary but low signal — leave in place. |
| `submit an IR with nulled required section` | `initial-report.spec.ts:388` | Ends in `test.skip` because the update DTO rejects nulls before submit gets the chance. | Seed a direct-SQL IR with a null section to exercise the submit-layer guard. |
| `/check idempotency` on first transfer | `itmo-lifecycle.spec.ts:395` | Asserts the flag on queryTransfers; doesn't verify the AEF row equivalent. | Add an AEF Actions assertion in the same test. |

---

## 5. Infrastructure gaps

- **Docker-compose required**: every test hits `http://localhost:3000` (national API) and most also open `http://localhost:3030` (web). No CI runs the compose stack; suite is effectively dev-only.
- **Podman-specific seeding**: `seedCreditBlockDirect`, `seedProgrammeDirect`, `seedAefActionDirect`, `seedEmissionRowDirect`, `seedCreditBlockLedgerEvent`, `setInitialReportStatusDirect` all shell out to `podman exec db psql …`. An `E2E_DB_CONTAINER` override exists but the container runtime is hard-coded to podman.
- **`test.fixme` blocks documenting known gaps** (post gap-fill):
  - `omge-sop-deductions:321` — env-var flip at runtime not doable from Playwright (the only remaining deductions fixme; renumbered from :314 after the two surrounding fixmes at :367 and :387 were flipped to real tests in the gap-fill pass).
  - (Referenced in `cross-cutting.spec.ts:572` comment) — no downstream code consults `/check` probe before issuing. Untestable without the issuance service wiring it.
- **1 `test.skip` with a live reason**: `initial-report:388` — DTO layer rejects nulls before submit-layer guard can be exercised.
- **Shared-DB race surface**: all tests write to the same running Postgres; factories produce unique IDs but shared counters (credit block serial sequence, auto-incremented CA IDs) mean two specs running in parallel could interfere. No `test.describe.configure({ mode: 'serial' })` is applied anywhere.
- **No `playwright.config.ts` project override** to pin workers=1 for Article 6 tests; default concurrency applies.
- **Enum-cardinality tests lock exact value counts** (e.g. `NdcType` exactly 2, `CaMethod` exactly 3, `AefActionTypeEnum` exactly 11). Legitimate adding of a new enum value will break these before the feature is merged — by design, but worth flagging for reviewers.
- **View-schema drift is unguarded**: the `programme_query_entity` bug surfaced in manual testing (a view frozen before Phase 2 added `cooperativeApproachId`) has no regression test. Any subsequent column addition to the `programme` or `project_entity` table will repeat the incident.

---

## 6. Summary

**Audit-date baseline (2026-04-24, pre-fill)**: 129 active tests across 7 specs, 4 `.fixme`, 1 `.skip`.

**After gap-fill sub-agent pass (2026-04-24)**:
- **Active tests**: 141 across 11 specs (7 existing + 4 new: `credit-issuance`, `credit-transfer`, `retirement`, `programme-lifecycle`).
- **`.fixme`**: 15 (up from 4) — 11 of the new ones document genuine backend gaps uncovered while writing the tests.
- **`.skip`**: 1 (unchanged).
- **New factories**: `createProgramme`, `authorizeProgramme`, `issueCredits`, `initiateTransfer`, `performRetireAction`, `approveRetireRequest`, `seedTransferrableBlock`, `seedPendingRetirementTransactionDirect`, `readLedgerCreditBlock`, `readLedgerBlocksByProject`.

### Coverage movement

| Tier | Before | After |
|---|---|---|
| **Critical** (5) | 0 addressed | #1 🔧, #2 ⚠, #3 🔧, #4 🚫 (out of scope — no endpoint exists), #5 🔧 |
| **Major** (15) | 0 addressed | #6 ✅, #7 ✅, #8 🔧, #9 ✅, #10 ✅, #11 ✅, #12 ✅, #17 🔧, #18 🔧, #19 ⚠ (10 of 15 addressed) |
| **Minor** (10) | 0 addressed | 0 addressed (explicit pass-over) |

### Backend gaps the gap-fill exercise surfaced

Each `.fixme` in the new specs pins a real compliance or correctness gap that wasn't visible from the code alone:

1. **Issuance happy path (#1)** — ✅ FIXED. `seedVerifiedMitigationActionDirect` appends a MitigationProperties row with a `VERIFICATION_REPORT` URL onto the ledger `programmes.data.mitigationActions` JSONB — no replicator or /addDocument refactor required. Lifted 4 `.fixme` blocks across credit-issuance and omge-sop-deductions.
2. **Issuance-without-CA guard (#20)** — ✅ FIXED. `issueProgrammeCredit` now mirrors the `/authorize` gate at 6415-6421 with a matching `article6trade && !cooperativeApproachId` check citing Dec 2/CMA.3 Annex para 18.
3. **Transfer under Revoked CA (#3)** — ✅ FIXED. `/transfer` now reads the linked CA status and rejects first-transfer with 400 citing Draft -/CMA.5 ¶21.
4. **Transfer-to-self (#8)** — ✅ FIXED. Service rejects with 400 when `user.companyId === receiverOrgId`.
5. **CA state-machine (#5, #11, #12)** — ✅ FIXED. `PUT /cooperativeApproach/update` now enforces a state machine: Completed and Revoked are terminal (400 on any outbound transition), and nothing may revert to Draft. Same-status updates remain no-ops.
6. **Authorize under Suspended CA (#17)** — ✅ FIXED. `programme.service.ts:6435` now rejects both REVOKED and SUSPENDED with a status-interpolated 400 citing Draft -/CMA.5 ¶¶ 20-21.
7. **Serial lineage on split (#18)** — ✅ FIXED. `transferCreditAmountFromBlocks` now derives itmoSerial sub-ranges onto both split children (retained parent + transferred child). Retirement path (programme-ledger.service.ts:936) already did.
8. **Programme create via HTTP** — writes to ledger only; RDBMS `programme` table is populated by the `ledger-replicator` container, which is not required-running in local dev. `/programme/query` cannot see freshly-created programmes without the replicator.

### What wasn't done in this pass

- **Minor gaps (10)** — deferred per scope decision.
- **Acquisition (Critical #4)** — no endpoint exists; stays a documented registry gap.
- **Many audit gaps still show ❌** in the coverage matrix because this pass targeted Critical + subset-of-Major only.

### Highest leverage for the next pass — DONE

The previously-highlighted leverage point ("expose a verified-mitigation-action fixture path") was landed as `seedVerifiedMitigationActionDirect`, unblocking the issuance happy path (#1), the no-CA issuance guard (#20), and two previously-`.fixme`'d tests in `omge-sop-deductions.spec.ts` — five tests flipped from `.fixme` to active in the gap-fill pass that produced this edit.
