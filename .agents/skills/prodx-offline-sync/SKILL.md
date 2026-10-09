---
name: prodx-offline-sync
description: Verifies durable offline outbox lifecycle, server-authoritative replay, idempotent sync, ordering, conflict handling, and recovery after restart or network failure.
---

# PRODX-POS Offline-First and Sync Engineering

## Non-negotiable rules
- Offline mode preserves availability; it does not make client-side financial or inventory state authoritative.
- Persist a command durably before reporting it as queued. A local optimistic state must be visibly distinct from server-committed state.
- Define and enforce the lifecycle: enqueue → persist → send → receive → validate → replay/apply → complete or fail → retry/terminal resolution.
- A transport-level `received` acknowledgment is not proof that the command was applied. Never leave commands permanently stuck merely because they were received.
- Every replayed mutation must have a durable idempotency key and server-side authorization/tenant validation.
- Preserve ordering where operations depend on one another. Define conflict policy and surface unresolved conflicts; never let the client silently choose authoritative financial/stock values.
- Retry transient errors with bounded backoff and explicit terminal failure semantics. Do not retry permanent validation/authorization errors indefinitely.
- Recover queue state after tab/process/browser restart and handle partial batches safely.

## Procedure
1. Trace local enqueue/storage through network sender, API, application service, database effects, and final client acknowledgment.
2. Inspect durable schema/versioning, payload validation, idempotency, ordering, conflict resolution, and retry classification.
3. Test disconnect before send, timeout after server commit, duplicate replay, partial batch failure, out-of-order commands, schema upgrade, restart, and permanent failure.
4. Verify completed commands are removed/archived only after authoritative success.
5. Compare client status with persisted server records and audit/ledger effects.

## Checklist
- [ ] Durable enqueue precedes a queued acknowledgment.
- [ ] Pending/offline status never claims server commitment.
- [ ] Server replay is authorized, validated, idempotent, and tenant-scoped.
- [ ] Received and applied/completed are distinct states.
- [ ] Ordering and conflict policies are explicit and tested.
- [ ] Retry/fail/terminal transitions are recoverable and observable.
- [ ] Restart and duplicate replay preserve exactly-once effect.

## Evidence contract
A local outbox implementation or UI indicator is not integration evidence. PASS requires end-to-end tests spanning durable client queue and real API/database effects. If that environment is absent, report **BLOCKED** or **UNVERIFIED** and list the missing evidence; do not claim production sync readiness.
