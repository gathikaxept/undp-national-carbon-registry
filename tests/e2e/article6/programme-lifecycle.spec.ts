/**
 * E2E coverage for the end-to-end programme lifecycle via the real HTTP
 * surface — create -> (optional authorize) -> observable state.
 *
 * Backs audit gaps #17 (Major) and #19 (Major) from
 * docs/testing/e2e-coverage.md. Prior to this file no test exercised
 * POST /national/programme/create; every programme in the suite was
 * inserted via `seedProgrammeDirect` SQL, which bypasses the full
 * ProgrammeDto validation layer and lets DTO regressions ship silently.
 *
 * Gap coverage:
 *   - #19 Major: exercise the real ProgrammeDto roundtrip (CA + IR +
 *     submit -> POST /programme/create -> GET /programme/getHistory).
 *     `getHistory` reads from the ledger via programmeLedger, which is
 *     where `create` actually writes. The RDBMS programme view used by
 *     POST /programme/query is populated by the ledger-replicator
 *     container; that replicator is Exited in the local dev stack
 *     (same blocker documented for credit_transactions_entity), so a
 *     query-view round-trip would time out.
 *   - #17 Major: authorize a programme under a Suspended CA. The
 *     backend only guards REVOKED today (programme.service.ts:6435);
 *     Suspended falls through the same code path and is accepted. The
 *     test codifies the *intended* contract (reject with 400) and is
 *     wrapped in test.fixme with a one-line citation because the
 *     symmetric Suspended guard does not yet exist.
 *
 * Scope is API-only. The full create -> authorize happy path is
 * documented but behind `.fixme` because /programme/authorize
 * additionally requires currentStage=APPROVED
 * (programme.service.ts:6474) and the Approved transition fires as a
 * side effect of a METHODOLOGY_DOCUMENT upload via
 * /programme/docAction (programme.service.ts:1166-1184). Wiring that
 * document-upload path is a larger scope than gap #19 asks for and is
 * tracked below.
 *
 * Parallel safety: CA titles, programme titles, externalId and the
 * Suspended-CA flow pass unique suffixes so specs can run concurrently
 * against a shared backend.
 */
import { test, expect } from "./support/fixtures";
import {
  authorizeProgramme,
  createCooperativeApproach,
  createProgramme,
  generateInitialReport,
  submitInitialReport,
  uniqueSuffix,
} from "./support/factories";
import { expectOk } from "./support/api-client";

function unwrap<T = any>(raw: any): T {
  if (raw == null) return raw;
  if (raw.data !== undefined) return raw.data as T;
  return raw as T;
}

test.describe("Programme lifecycle - POST /national/programme/create", () => {
  // ------------------------------------------------------------------
  // Gap #19 Major executable body: the real ProgrammeDto reaches the
  // ledger. Every required field in ProgrammeDto is exercised via the
  // factory defaults — a DTO regression (missing field, bad enum
  // value, validation drift) surfaces here as a non-2xx from
  // /programme/create. The readback uses GET /programme/getHistory
  // because that is the endpoint that reads from the ledger where the
  // create service writes; POST /programme/query reads from the
  // replicator-maintained RDBMS view which is not populated in local
  // dev (ledger-replicator container is Exited).
  // ------------------------------------------------------------------
  test("real ProgrammeDto creates a programme that is readable via getHistory", async ({
    apiDna,
  }) => {
    // Arrange: a CA link is not strictly required for create (the
    // article6trade gate fires only on /authorize) but we attach one
    // so the ledger row exercises cooperativeApproachId persistence.
    const ca = await createCooperativeApproach(apiDna, {
      title: `Lifecycle Create ${uniqueSuffix()}`,
    });

    // Act: real /programme/create. Factory defaults fill every
    // required ProgrammeDto field (designDocument, geographicalLocation
    // matched to the seeded region table, proponentTaxVatId matched to
    // an existing company, startTime/endTime in the future).
    const prog = await createProgramme(apiDna, {
      cooperativeApproachId: ca.cooperativeApproachId,
      title: `Programme Roundtrip ${uniqueSuffix()}`,
    });
    expect(prog.programmeId).toBeTruthy();

    // Assert: the ledger returns the programme via /getHistory. This
    // is the observable outcome a downstream consumer (CADT sync,
    // ledger-replicator, explorer UI) would see.
    const historyRes = await apiDna.get(
      `national/programme/getHistory?programmeId=${encodeURIComponent(
        prog.programmeId
      )}`
    );
    await expectOk(historyRes, "getHistory");
    const history = unwrap<any[]>(await apiDna.json<any>(historyRes));
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    const latest = history[0]?.data ?? history[0];
    expect(latest?.programmeId).toBe(prog.programmeId);
    expect(latest?.cooperativeApproachId).toBe(ca.cooperativeApproachId);
    expect(latest?.article6trade).toBe(true);
  });

  // ------------------------------------------------------------------
  // Gap #19 Major flagship target: full create -> authorize roundtrip
  // with currentStage=Authorised at the end. Today this requires an
  // intermediate METHODOLOGY_DOCUMENT /docAction call because
  // /programme/authorize demands currentStage=APPROVED
  // (programme.service.ts:6474) and /programme/create leaves the
  // programme in AWAITING_AUTHORIZATION (programme.service.ts:2197).
  // The APPROVED transition is a side effect of a
  // METHODOLOGY_DOCUMENT /docAction flow (programme.service.ts:
  // 1166-1184). Until we have a factory for that upload path — and a
  // running ledger-replicator so the query view sees the final state —
  // this happy path is blocked. When both land, this body becomes the
  // canonical gap #19 lock.
  // ------------------------------------------------------------------
  test.fixme(
    "create -> approve methodology doc -> authorize -> programme visible with currentStage=Authorised",
    async ({ apiDna }) => {
      // Audit gap #19: the full roundtrip is not achievable until (a)
      // a test helper exists that walks a programme through
      // METHODOLOGY_DOCUMENT /docAction to flip
      // AwaitingAuthorization -> Approved, and (b) the
      // ledger-replicator container is running so the query view
      // surfaces the final Authorised state. The underlying
      // /programme/create path is already exercised by the executable
      // test above; this fixme documents the remaining authorize leg.
      const ca = await createCooperativeApproach(apiDna, {
        title: `Full Roundtrip ${uniqueSuffix()}`,
      });
      const ir = await generateInitialReport(apiDna, {
        cooperativeApproachId: ca.cooperativeApproachId,
      });
      await submitInitialReport(apiDna, ir.reportId);
      const prog = await createProgramme(apiDna, {
        cooperativeApproachId: ca.cooperativeApproachId,
        article6trade: true,
        title: `Programme FullDTO ${uniqueSuffix()}`,
      });

      // Step between create and authorize: upload a methodology
      // document and have DNA approve it, flipping the programme to
      // APPROVED. No factory exists for this today.

      await authorizeProgramme(apiDna, prog.programmeId);

      const res = await apiDna.post("national/programme/query", {
        page: 1,
        size: 50,
        filterAnd: [
          { key: "programmeId", operation: "=", value: prog.programmeId },
        ],
      });
      await expectOk(res, "programme/query");
      const rows: any[] = unwrap<any>(await apiDna.json<any>(res)) ?? [];
      const row = rows.find((r) => r.programmeId === prog.programmeId);
      expect(row?.currentStage).toBe("Authorised");
    }
  );

  // ------------------------------------------------------------------
  // Gap #19 companion guard: authorize-before-APPROVED is rejected.
  // The /authorize route demands currentStage=APPROVED
  // (programme.service.ts:6474) and returns 400
  // "programme.notInPendingState" for anything else. A fresh
  // HTTP-created programme sits in AWAITING_AUTHORIZATION, so
  // calling authorize immediately must 400. This locks the
  // state-machine contract end-to-end through the real create DTO.
  // ------------------------------------------------------------------
  test("authorize immediately after HTTP create returns 400 (programme not in APPROVED state)", async ({
    apiDna,
  }) => {
    // Arrange
    const ca = await createCooperativeApproach(apiDna, {
      title: `Authorize Pre-Approved ${uniqueSuffix()}`,
    });
    const ir = await generateInitialReport(apiDna, {
      cooperativeApproachId: ca.cooperativeApproachId,
    });
    await submitInitialReport(apiDna, ir.reportId);
    const prog = await createProgramme(apiDna, {
      cooperativeApproachId: ca.cooperativeApproachId,
      article6trade: true,
      title: `Programme PreApprove ${uniqueSuffix()}`,
    });

    // Act
    const res = await apiDna.put("national/programme/authorize", {
      programmeId: prog.programmeId,
    });

    // Assert: the AWAITING_AUTHORIZATION -> APPROVED transition has
    // not run yet, so /authorize refuses. Locks the state-machine
    // guard at programme.service.ts:6474.
    expect(res.ok()).toBe(false);
    expect(res.status()).toBe(400);
  });

  // ------------------------------------------------------------------
  // Gap #17 Major: attempting to authorize under a Suspended CA must
  // mirror the Revoked-CA contract at programme.service.ts:6435-6440.
  // The service now rejects both REVOKED and SUSPENDED with a status-
  // interpolated message citing Draft -/CMA.5 paras 20-21.
  // ------------------------------------------------------------------
  test(
    "authorizing a programme whose CA is Suspended returns 400 citing the Suspended state",
    async ({ apiDna }) => {
      const ca = await createCooperativeApproach(apiDna, {
        title: `Suspended Source ${uniqueSuffix()}`,
      });
      const ir = await generateInitialReport(apiDna, {
        cooperativeApproachId: ca.cooperativeApproachId,
      });
      await submitInitialReport(apiDna, ir.reportId);
      const suspendRes = await apiDna.put(
        "national/cooperativeApproach/update",
        {
          cooperativeApproachId: ca.cooperativeApproachId,
          status: "Suspended",
        }
      );
      await expectOk(suspendRes, "suspend CA");

      const prog = await createProgramme(apiDna, {
        cooperativeApproachId: ca.cooperativeApproachId,
        article6trade: true,
        title: `Programme Suspended ${uniqueSuffix()}`,
      });

      // Act
      const res = await apiDna.put("national/programme/authorize", {
        programmeId: prog.programmeId,
      });

      // Assert: intended contract — authorize is blocked while the CA
      // is paused. Mirror of the Revoked-CA test at
      // cross-cutting.spec.ts:677. Message should cite Suspended and
      // the UNFCCC clause once the guard ships.
      expect(res.ok()).toBe(false);
      expect(res.status()).toBe(400);
      const body = await res.text();
      expect(body).toMatch(/suspend/i);
    }
  );
});
