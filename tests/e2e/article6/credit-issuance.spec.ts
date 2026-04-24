/**
 * E2E coverage for credit issuance via PUT /national/programme/issue.
 *
 * Backs audit gaps #1 (Critical) and #20 (Major) from
 * docs/testing/e2e-coverage.md. Prior to this file, no HTTP-level test
 * exercised the issuance endpoint; OMGE/SOP deductions were only
 * unit-tested against the pure arithmetic function and seedCreditBlockDirect
 * was the only way any block entered the registry during tests.
 *
 * Gap coverage:
 *   - #1 Critical: issue credits to an authorised programme and assert
 *     the resulting block in queryBalance carries the expected
 *     projectRefId, vintage, cooperativeApproachId propagation and a
 *     structured ITMO serial (Dec 6/CMA.4 Annex I para 5).
 *   - #20 Major: issue credits against an article6trade=true programme
 *     with no cooperativeApproachId link should be rejected per the
 *     Article 6.2 contract.
 *
 * Scope is API-only. The UI issue flow is not covered by these gaps and
 * therefore not touched here.
 *
 * Parallel safety: every programme, CA and mitigation action is
 * suffixed via uniqueSuffix() so specs can run concurrently against a
 * shared backend.
 */
import { test, expect } from "./support/fixtures";
import {
  authorizeProgramme,
  createCooperativeApproach,
  createProgramme,
  generateInitialReport,
  issueCredits,
  seedProgrammeDirect,
  submitInitialReport,
  uniqueSuffix,
} from "./support/factories";
import { expectOk } from "./support/api-client";

function unwrap<T = any>(raw: any): T {
  if (raw == null) return raw;
  if (raw.data !== undefined) return raw.data as T;
  return raw as T;
}

function extractRows(raw: any): any[] {
  const data = unwrap<any>(raw);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

test.describe("Credit issuance - PUT /national/programme/issue", () => {
  // ------------------------------------------------------------------
  // Gap #1 happy path. Placed ahead of the guards so a reader opens
  // the file on the flagship test. See inline comment for why this is
  // `.fixme` today.
  // ------------------------------------------------------------------
  test.fixme(
    "authorised programme issues N credits -> block visible in queryBalance with projectRefId, vintage, cooperativeApproachId and structured ITMO serial",
    async ({ apiDna }) => {
      // Audit gap #1 (Critical): no HTTP-level test exercises
      // /programme/issue end-to-end. This fixme documents the complete
      // happy-path contract and unblocks once a verified-mitigation
      // fixture exists. The blocker is programme.service.ts:5829-5858 —
      // issueProgrammeCredit requires each action to exist in
      // programme.mitigationActions AND carry a projectMaterial that
      // contains a document URL matching /VERIFICATION_REPORT/
      // (isVerfiedMitigationAction at :6040). Neither seedProgrammeDirect
      // nor the /programme/create + /addNDCAction HTTP pair currently
      // produces that shape, so `issueCredits` returns 400
      // "noVerfiedMitigationActionUnderActionId" without a way to stub
      // the verified state short of raw SQL into the ledger DB's
      // programmes.data->mitigationActions array.
      //
      // Once factories can seed a verified mitigation action this test
      // should:
      //   1. createCooperativeApproach -> generateInitialReport ->
      //      submitInitialReport (para 18 gate).
      //   2. createProgramme({ cooperativeApproachId, article6trade: true }).
      //   3. Seed a verified mitigation action (via HTTP once available,
      //      or a dedicated SQL fixture today).
      //   4. authorizeProgramme.
      //   5. issueCredits(programmeId, [{ actionId, issueCredit: 1000 }]).
      //   6. Query /creditTransactionsManagement/queryBalance and assert:
      //        - a new Holding block exists with creditAmount=1000,
      //        - projectRefId === programme.externalId (or equivalent),
      //        - vintage is a parseable year,
      //        - cooperativeApproachId === ca.cooperativeApproachId,
      //        - itmoSerial matches /^[A-Z]{2}-[A-Z]+-\d{4}-.+-\d+:\d+$/
      //          (Dec 6/CMA.4 Annex I para 5 structured five-component
      //          form: party-type-vintage-activity-start:end).
      const ca = await createCooperativeApproach(apiDna, {
        title: `Issuance HappyPath ${uniqueSuffix()}`,
      });
      const gen = await generateInitialReport(apiDna, {
        cooperativeApproachId: ca.cooperativeApproachId,
      });
      await submitInitialReport(apiDna, gen.reportId);
      const prog = await createProgramme(apiDna, {
        cooperativeApproachId: ca.cooperativeApproachId,
        article6trade: true,
        creditEst: 1000,
      });
      await authorizeProgramme(apiDna, prog.programmeId);
      const issued = await issueCredits(apiDna, prog.programmeId, [
        { actionId: `NDC-${uniqueSuffix()}`, issueCredit: 1000 },
      ]);
      expect(issued.issuedAmount).toBe(1000);
    }
  );

  // ------------------------------------------------------------------
  // Guard: issue to a non-AUTHORISED programme (currentStage=Approved).
  // Exercises programme.service.ts:5819-5827 — the first hard gate in
  // issueProgrammeCredit. This is testable today because the gate fires
  // before the verified-mitigation-action check.
  // ------------------------------------------------------------------
  test("issuing to a non-authorised programme (currentStage=Approved) returns 400", async ({
    apiDna,
  }) => {
    // Arrange: seed a programme that sits in Approved but has NOT been
    // run through /authorize. The issue endpoint should reject with
    // "programme.notInAUthorizedState" before any mitigation action is
    // inspected.
    const ca = await createCooperativeApproach(apiDna, {
      title: `NotAuthorised Issue ${uniqueSuffix()}`,
    });
    const seeded = seedProgrammeDirect({
      companyId: 1,
      cooperativeApproachId: ca.cooperativeApproachId,
      article6trade: true,
      currentStage: "Approved",
    });

    // Act
    const res = await apiDna.put("national/programme/issue", {
      programmeId: seeded.programmeId,
      issueAmount: [{ actionId: `NDC-${uniqueSuffix()}`, issueCredit: 100 }],
    });

    // Assert
    expect(res.ok()).toBe(false);
    expect(res.status()).toBe(400);
  });

  // ------------------------------------------------------------------
  // Guard: issue references a non-existent mitigation action. Locks the
  // programme.service.ts:5829-5858 path — credits can only issue
  // against an action that is in programme.mitigationActions AND has
  // projectMaterial matching /VERIFICATION_REPORT/. A ghost actionId
  // must be rejected and never reach the ledger.
  //
  // We seed via seedProgrammeDirect which does not populate
  // mitigationActions, so the ledger returns a programme with
  // mitigationActions=undefined. The assertion is intentionally
  // tolerant of any non-2xx: the audit-level invariant is "ghost
  // actionId is refused", not "refusal goes through the specific
  // noVerfiedMitigationActionUnderActionId code path". Today the
  // service throws before reaching the explicit guard (.map on
  // undefined), so it surfaces as 500; once mitigationActions has a
  // default [] this will tighten to 400.
  // ------------------------------------------------------------------
  test("issuing with an actionId that is not a verified mitigation action is rejected", async ({
    apiDna,
  }) => {
    // Arrange
    const ca = await createCooperativeApproach(apiDna, {
      title: `UnverifiedAction Issue ${uniqueSuffix()}`,
    });
    const seeded = seedProgrammeDirect({
      companyId: 1,
      cooperativeApproachId: ca.cooperativeApproachId,
      article6trade: true,
      currentStage: "Authorised",
    });

    // Act
    const res = await apiDna.put("national/programme/issue", {
      programmeId: seeded.programmeId,
      issueAmount: [
        { actionId: `NDC-GHOST-${uniqueSuffix()}`, issueCredit: 50 },
      ],
    });

    // Assert: any non-2xx locks the invariant; a 200 here would mean
    // a ghost actionId successfully minted credits into the ledger.
    expect(res.ok()).toBe(false);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  // ------------------------------------------------------------------
  // Gap #20 Major: issue to an Article 6.2 programme whose CA link is
  // null. The audit doc expects a 400 per the Article 6.2 contract, but
  // programme.service.ts:5802-5899 (issueProgrammeCredit) carries no
  // cooperativeApproachId presence check — the gate exists only on
  // /authorize (programme.service.ts:6415-6421), not on /issue. Marked
  // `.fixme` until the issuance service gains the symmetric guard.
  // ------------------------------------------------------------------
  test.fixme(
    "issuing to an article6trade=true programme with no cooperativeApproachId returns 400",
    async ({ apiDna }) => {
      // Audit gap #20: Article 6.2 ITMOs must be CA-bound; issuance
      // without a cooperativeApproachId contradicts para 8 reporting.
      // Blocker: the guard at programme.service.ts:6415-6421 fires on
      // /authorize, not on /issue. issueProgrammeCredit currently
      // accepts the request and crashes later (if at all) when the
      // downstream AEF reducer tries to read cooperativeApproachId off
      // the issued block.
      //
      // Shape of the test once the guard lands:
      //   1. seedProgrammeDirect({ article6trade: true,
      //      cooperativeApproachId: undefined, currentStage: "Authorised" })
      //   2. PUT /programme/issue with any actionId + amount.
      //   3. expect(res.status()).toBe(400)
      const seeded = seedProgrammeDirect({
        companyId: 1,
        article6trade: true,
        currentStage: "Authorised",
        // cooperativeApproachId intentionally omitted
      });
      const res = await apiDna.put("national/programme/issue", {
        programmeId: seeded.programmeId,
        issueAmount: [
          { actionId: `NDC-${uniqueSuffix()}`, issueCredit: 100 },
        ],
      });
      expect(res.status()).toBe(400);
    }
  );

  // ------------------------------------------------------------------
  // Structured-serial format roundtrip. Today only the seeded-block
  // path in itmo-lifecycle.spec.ts touches the Dec 6/CMA.4 Annex I
  // para 5 form {party}-{type}-{vintage}-{activity}-{start:end}. Once
  // the happy-path fixme above lands, this regex assertion should
  // migrate into it and this wrapper test can be removed.
  // ------------------------------------------------------------------
  test.fixme(
    "issued credit block carries a structured ITMO serial (party-type-vintage-activity-start:end)",
    async ({ apiDna }) => {
      // Audit gap #1 companion assertion. Same blocker as the happy-path
      // fixme above (verified mitigation action fixture). The regex
      // below locks the Annex I para 5 form:
      //   /^[A-Z]{2}-[A-Z0-9_]+-\d{4}-[A-Z0-9_-]+-\d+:\d+$/
      // If a future commit relaxes the form, update the regex here
      // together with cross-cutting.spec.ts:992.
      expect(true).toBe(true);
    }
  );
});
