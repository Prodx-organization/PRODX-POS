---
name: prodx-inventory-integrity
description: Checks stock reservation, deduction, return/reversal, movement ledger, negative-stock policy, store scope, reconciliation, and concurrent inventory mutations.
---

# PRODX-POS Inventory Integrity

## Non-negotiable rules
- Inventory authority belongs to the server/database, not the browser or offline client.
- Represent every material stock change with a durable, attributable inventory movement/ledger entry.
- Sale deduction, reservation, release, refund/return, void reversal, and manual adjustment must have explicit semantics and audit evidence.
- Enforce the configured negative-stock policy in the database transaction; UI validation is not a boundary.
- Concurrent sales, imports, returns, and adjustments must not oversell or lose updates. Use atomic conditional updates, row locks, serializable logic, or equivalent proven controls.
- Every retryable stock mutation needs durable idempotency. A retry must not apply a movement twice.
- Scope every read/write by trusted organization/store context; do not accept tenant scope from untrusted payloads.

## Procedure
1. Map the stock lifecycle from checkout and import through ledger, balance, refund, void, and adjustment.
2. Inspect constraints, transaction boundaries, locking, unique operation keys, and audit records.
3. Test two or more concurrent operations competing for the same stock.
4. Inject failure between movement creation and balance update (or the inverse) and prove atomicity/recovery.
5. Reconcile the materialized balance against the movement ledger and investigate drift.

## Checklist
- [ ] Stock mutations are server-authoritative and tenant/store-scoped.
- [ ] Ledger and balance remain consistent after commit, rollback, and retry.
- [ ] Negative-stock behavior is explicitly configured and enforced.
- [ ] Concurrent sales cannot oversell contrary to policy.
- [ ] Refund/void reversals are bounded and idempotent.
- [ ] Manual adjustments record actor, reason, target, and outcome.
- [ ] Reconciliation detects unexplained drift.

## Evidence contract
Require PostgreSQL integration/concurrency tests and persisted ledger/balance assertions. Mark **BLOCKED** if the database or required runtime is unavailable; mark **UNVERIFIED** if only unit tests or code inspection exist. Never infer inventory integrity from a green UI flow.
