---
name: prodx-testing
description: Designs risk-based unit, API, PostgreSQL integration, concurrency, failure-injection, contract, architecture, and end-to-end tests for PRODX-POS.
---

# PRODX-POS Testing Engineering

## Non-negotiable rules
- Tests must assert business invariants and persisted outcomes, not merely that a function was called.
- Unit tests are useful but do not replace real PostgreSQL, API-boundary, provider-contract, or end-to-end evidence where applicable.
- A test must exercise the production path relevant to the claim. Do not let mocks bypass the code under test.
- Never skip, weaken, rename, conditionally bypass, or delete a required test/gate to get a green result.
- Test cleanup must be isolated and deterministic; tests must not depend on run order or shared stale state.
- Cover negative cases, race conditions, retries, partial failures, restart recovery, and boundary values according to risk.
- Record exact commit SHA, command, environment/dependency versions, and outcome. A command that did not run is BLOCKED, not PASS.

## Test selection
- Unit: deterministic domain rules, parsers, validators, rounding.
- API/contract: authentication, authorization, schemas, status codes, safe errors.
- PostgreSQL integration: constraints, migrations, transaction rollback, locking, RLS, idempotency, ledger effects.
- Concurrency: simultaneous requests, duplicate keys, stock/refund races, lock behavior.
- Failure injection: timeout before/after commit, provider unavailable, DNS/connectivity errors, process restart.
- E2E: production composition from route through database/provider boundary.
- Architecture/security: dependency direction, mock boundaries, secret/log hygiene, tenant isolation.

## Procedure
1. Convert each acceptance criterion into observable assertions.
2. Choose the lowest-cost test that proves each invariant, then add higher-boundary tests where required.
3. Ensure the test would fail if the relevant protection were removed.
4. Run targeted tests, then required full suites and static/build gates when feasible.
5. Inspect skipped/pending jobs and environment blockers; do not summarize them as passed.
6. Verify test and CI results correspond to the exact pushed SHA.

## Checklist
- [ ] Critical invariant and negative paths are asserted.
- [ ] Integration tests use real PostgreSQL when database semantics matter.
- [ ] Concurrency/retry/failure cases match the operation's risk.
- [ ] Test data and cleanup are deterministic.
- [ ] No blanket skip, weakened assertion, or mock-only production claim exists.
- [ ] CI exact-head checks and logs have been inspected.

## Evidence contract
Report each gate as **PASS**, **FAIL**, **BLOCKED**, **UNVERIFIED**, or **NOT APPLICABLE**, with command/run URL and exact SHA. Never translate an infrastructure failure or unexecuted command into PASS.
