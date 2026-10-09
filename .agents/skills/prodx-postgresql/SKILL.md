---
name: prodx-postgresql
description: Validates PRODX-POS PostgreSQL schema, migrations, transaction boundaries, constraints, role grants, RLS, concurrency, and recovery compatibility.
---

# PRODX-POS PostgreSQL Engineering

## Source of truth
PostgreSQL is authoritative for transactional business state. UI state, local queues, caches, and provider responses cannot replace database invariants.

## Non-negotiable rules
- Monetary values use `NUMERIC/DECIMAL`; never use floating-point as authoritative money.
- Enforce critical invariants with database constraints, unique indexes, foreign keys, checks, and transaction-safe functions where appropriate.
- Define transaction boundaries explicitly. A partial failure must not leave payment, sale, refund, stock, or audit records inconsistent.
- Migrations must be deterministic, uniquely versioned, repeatable where designed, and safe to apply to supported starting states. Avoid duplicate migration heads.
- Verify both upgrade and re-application/idempotency behavior. Downgrade only when a supported safe downgrade exists; never promise reversibility of destructive financial changes.
- Use UTC for authoritative timestamps and explicit business/store timezone conversion.
- Runtime roles must be least-privileged, non-superuser, and must not bypass RLS. Do not use owner/admin credentials in application runtime.
- Concurrency-sensitive invariants require locking/atomic SQL/unique constraints and real PostgreSQL tests.

## Procedure
1. Read the schema, migration runner, existing migrations, and database architecture docs.
2. Identify tables, constraints, indexes, triggers, policies, grants, and transaction boundaries touched.
3. Test fresh install, upgrade from supported prior state, re-apply, and rollback/compensation semantics.
4. Use PostgreSQL integration tests for locking, isolation, constraints, and race conditions; mocks are supplemental only.
5. Verify runtime connection identity and effective grants where authorized.
6. Inspect query plans/index impact when query or workload changes justify it.

## Checklist
- [ ] Constraints enforce the invariant even if application validation is bypassed.
- [ ] Migration ledger and files agree; no duplicate heads.
- [ ] Transactions are atomic and errors roll back correctly.
- [ ] Concurrent writers cannot violate invariants.
- [ ] RLS and grants match the intended tenant/runtime model.
- [ ] Runtime role is verified from a live connection when claiming production readiness.
- [ ] Restore procedures remain compatible with schema changes.

## Evidence contract
Cite migration paths/versions, schema assertions, PostgreSQL integration output, exact commit SHA, and live `current_user`/role attributes when applicable. If PostgreSQL is unavailable, mark the database gate **BLOCKED**, not PASS. Static type checks do not prove database correctness.
