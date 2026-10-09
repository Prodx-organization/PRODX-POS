---
name: prodx-concurrency-idempotency
description: Use for retryable commands, checkout, payment, refund, void, stock mutation, offline sync, webhook callbacks, locks, or race-condition fixes.
---

# Concurrency and Idempotency Engineering

## Define the effect boundary

For each operation document:
- operation identity and idempotency-key scope;
- canonical request fields bound to that key;
- authoritative database rows and constraints;
- transaction and lock boundaries;
- external side effects and ambiguous timeout behavior;
- terminal/retryable states and recovery path;
- audit/outbox effects that must occur once.

## Invariants

- At-least-once delivery is expected. Design for exactly-once *effect*, not an assumption of exactly-once transport.
- Repeating the same key and same semantic payload returns the stored result without duplicating effects.
- Reusing a key with a conflicting payload must fail deterministically.
- Check idempotency again after acquiring the relevant lock; a pre-lock read alone is race-prone.
- Back critical guarantees with unique constraints/transactions, not only in-memory maps.
- Lock order must be consistent; test deadlocks and competing requests.
- Provider calls and database commits can fail independently. Use explicit states/outbox/reconciliation to recover ambiguous outcomes.
- Offline sync must persist commands before sending, handle replay/order/conflicts, and only mark complete after the defined durable effect is confirmed.

## Regression tests

- Two or more concurrent requests with the same key.
- Same key with conflicting payload.
- Different keys racing against one payment/refund/stock item.
- Retry after transaction rollback, process restart, network timeout, or provider success with lost response.
- Duplicate and out-of-order callbacks.
- Outbox crash between send, receive, durable commit, and completion acknowledgement.
- Cross-tenant replay and authorization changes between enqueue and replay.

## Verification checklist

- [ ] Database uniqueness/locking backs the guarantee.
- [ ] Tests exercise real PostgreSQL when concurrency or transaction semantics matter.
- [ ] External effects have idempotency references and reconciliation semantics.
- [ ] No operation is marked complete before its required durable effect.
- [ ] Failure/retry/dead-letter behavior is bounded and observable.
- [ ] Audit effects are not duplicated or silently omitted.
- [ ] Exact CI evidence exists for the final SHA.

Do not claim "exactly once" without defining the effect boundary and failure model. If a required concurrent/runtime test cannot run, report **BLOCKED** or **UNVERIFIED**.
