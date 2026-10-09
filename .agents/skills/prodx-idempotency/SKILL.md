---
name: prodx-idempotency
description: Reviews retry safety, duplicate suppression, concurrency races, durable idempotency keys, and exactly-once effect across PRODX-POS mutations and sync.
---

# PRODX-POS Idempotency and Concurrency

## Core distinction
Networks may deliver a request more than once. Require exactly-once *effect* through durable state and constraints; do not claim exactly-once delivery.

## Non-negotiable rules
- Scope idempotency keys to the authenticated tenant, operation, and relevant resource; reject key reuse with a different semantic payload.
- Persist the key, request fingerprint, operation state, and stable result atomically with the business mutation where possible.
- Use a unique database constraint or equivalent durable serialization as the final duplicate barrier. An in-memory map is not sufficient.
- Concurrent duplicates must converge to one durable result; they must not double-charge, double-refund, double-deduct stock, or duplicate audit side effects.
- Define behavior for in-progress, completed, retryable failure, terminal failure, and unknown external outcome.
- Provider callbacks/webhooks must be authenticated, deduplicated, and safe under reordering.
- Keep idempotency retention long enough to cover realistic retry, offline replay, and provider redelivery windows.

## Procedure
1. Enumerate all retryable mutations: checkout, payment, refund, void, inventory adjustment, offline sync, import, and callbacks.
2. Trace key generation, scope, persistence, uniqueness, payload comparison, result replay, and cleanup.
3. Test same key/same payload, same key/different payload, concurrent duplicate requests, crash/restart, timeout after commit, and retry after partial failure.
4. Verify database effects, ledger/audit count, and external-provider reconciliation.
5. Check that lock/unique-conflict handling returns the prior result or a safe conflict rather than rerunning effects.

## Checklist
- [ ] Durable uniqueness is enforced by the database.
- [ ] Key scope includes tenant and operation semantics.
- [ ] Payload mismatch cannot reuse an existing key.
- [ ] Concurrent duplicate calls create one business effect.
- [ ] Retries after uncertain outcomes reconcile before repeating external effects.
- [ ] Retention/cleanup cannot reopen a duplicate-effect window.

## Evidence contract
PASS requires exact integration/concurrency tests and database constraints on the exact commit. If only sequential unit tests exist, mark **UNVERIFIED**. If a provider or database is unavailable, mark **BLOCKED**. Never weaken a unique constraint or skip race tests to make the gate green.
